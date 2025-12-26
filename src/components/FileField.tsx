import Uploady, { useItemStartListener, useItemFinishListener, useItemProgressListener, useAbortItem, useItemErrorListener } from '@rpldy/uploady';
import UploadDropZone from '@rpldy/upload-drop-zone';
import UploadButton from '@rpldy/upload-button';
import UploadPreview from '@rpldy/upload-preview';
import type { PreviewComponentProps } from '@rpldy/upload-preview';
import { useState, forwardRef, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { filesize } from 'filesize';
import '../styles/uploady-ext.css';

interface FileFieldProps {
    value?: any;
    onChange?: (value: any) => void;
    className?: string;
    accept?: string;
    isMultiple?: boolean;
    maxFiles?: number;
    maxSize?: number; // in bytes
}

const FileField = forwardRef<HTMLInputElement, FileFieldProps>(
    ({ value, onChange, className, accept, isMultiple, maxFiles, maxSize }, ref) => {
        const height: number = 200;

        // State to store file metadata for preview
        const [fileMetadata, setFileMetadata] = useState<Map<string, any>>(new Map());

        // State to store upload progress for each file
        const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());

        // Counter for currently uploading files
        const uploadingCountRef = useRef(0);

        // Ref to always have the latest fileMetadata
        const fileMetadataRef = useRef<Map<string, any>>(new Map());

        // Ref for scroll container
        const scrollContainerRef = useRef<HTMLDivElement>(null);

        // Update ref whenever fileMetadata changes
        useEffect(() => {
            fileMetadataRef.current = fileMetadata;
        }, [fileMetadata]);

        // Auto-scroll to the end when new files are added
        useEffect(() => {
            if (scrollContainerRef.current && fileMetadata.size > 0) {
                scrollContainerRef.current.scrollTo({
                    left: scrollContainerRef.current.scrollWidth,
                    behavior: 'smooth'
                });
            }
        }, [fileMetadata.size]);

        // Reset in form
        useEffect(() => {
            const handleFormReset = (event: Event) => {
                const form = event.target as HTMLFormElement;

                if (form.contains(scrollContainerRef.current)) {
                    setFileMetadata(new Map());
                    setUploadProgress(new Map());
                    uploadingCountRef.current = 0;

                    // Notify parent component about the value change
                    onChange?.(isMultiple ? [] : null);
                }
            };

            // Add reset event listener
            window.addEventListener('reset', handleFormReset);

            return () => {
                // Remove event listener on unmount
                window.removeEventListener('reset', handleFormReset);
            };
        }, [onChange, isMultiple]);
        

        // File filter to prevent duplicates and enforce maxFiles limit
        const fileFilter = useCallback((file: any) => {
            const currentCount = fileMetadataRef.current.size + uploadingCountRef.current;

            // Check file size limit
            if (maxSize && file.size > maxSize) {
                const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);

                toast.error(`File '${file.name}' is too large (${sizeMB}MB). Maximum allowed size is ${maxSizeMB}MB. ${file.name} blocked`);
                return false;
            }

            // Check maxFiles limit
            if (maxFiles && currentCount >= maxFiles) {
                toast.error(`Max files limit reached (${maxFiles}): ${file.name} blocked`);
                return false;
            }

            // Check if file already exists
            const isDuplicate = Array.from(fileMetadataRef.current.values()).some(
                meta => meta.originalName === file.name && meta.size === file.size
            );

            if (isDuplicate) {
                toast.error(`Duplicate file blocked: ${file.name}`);
                return false;
            }

            return true;
        }, [maxFiles, maxSize]);

        // Upload handler component for file uploads
        const UploadHandler = ({ onUploaded }: { onUploaded: (data: any) => void }) => {
            useItemStartListener((item) => {
                // Increment uploading counter
                uploadingCountRef.current++;

                setFileMetadata(prev => {
                    const newMap = new Map(prev);

                    newMap.set(item.id, {
                        url: item.url,
                        filename: item.file?.name,
                        originalName: item.file?.name,
                        size: item.file?.size,
                        mimetype: item.file?.type
                    });

                    return newMap;
                });
            });
            // Listen to upload progress
            useItemProgressListener((item) => {
                if (item.completed < 100) {
                    setUploadProgress(prev => {
                        const newMap = new Map(prev);
                        newMap.set(item.id, item.completed);
                        return newMap;
                    });
                } else {
                    // Remove progress when complete
                    setUploadProgress(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(item.id);
                        return newMap;
                    });
                }
            });

            useItemErrorListener((item) => {
                toast.error(item?.uploadResponse?.data?.error || 'Upload failed');
                // Remove preview and progress for errored item
                setFileMetadata(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(item.id);
                    return newMap;
                });
                setUploadProgress(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(item.id);
                    return newMap;
                });

                // Decrement uploading counter
                uploadingCountRef.current = Math.max(0, uploadingCountRef.current - 1);
            });

            useItemFinishListener((item) => {
                // Decrement uploading counter
                uploadingCountRef.current = Math.max(0, uploadingCountRef.current - 1);

                if (item.state === 'finished') {
                    const responseData = item.uploadResponse?.data;
                    const url = responseData?.url ?? null;

                    // If no URL is returned, stop processing
                    if (!url) {
                        return;
                    }

                    // Store file metadata for preview
                    setFileMetadata(prev => {
                        const newMap = new Map(prev);
                        if (newMap.has(item.id)) {
                            newMap.set(item.id, {
                                ...newMap.get(item.id),
                                url: responseData?.url,
                                filename: responseData?.filename,
                                originalName: responseData?.originalName,
                                size: responseData?.size,
                                mimetype: responseData?.mimetype,
                                isUploading: false,
                            });
                        }
                        return newMap;
                    });

                    // For multiple files, append to existing array
                    if (isMultiple) {
                        const currentValue = Array.isArray(value) ? value : [];
                        onUploaded([...currentValue, url]);
                    } else {
                        onUploaded(url);
                    }
                }
            });

            return null;
        };

        // Custom preview component for uploaded files
        const cleanupAllFiles = () => {
            // Use ref to get the latest fileMetadata
            const filenames = Array.from(fileMetadataRef.current.values()).map(meta => meta.filename);

            if (filenames.length === 0) {
                return;
            }

            // Try sendBeacon first (most reliable)
            const blob = new Blob(
                [JSON.stringify({ filenames })],
                { type: 'application/json' }
            );

            if (navigator.sendBeacon('/api/upload/temp/cleanup', blob)) {
                // Cleanup request sent via beacon
                return;
            }

            // Fallback to fetch with keepalive
            fetch('/api/upload/temp/cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filenames }),
                keepalive: true // Important for page unload
            }).catch(error => console.error('Cleanup failed:', error));
        };

        // Cleanup all temp files on component unmount
        useEffect(() => {
            const handleBeforeUnload = (_: BeforeUnloadEvent) => {
                cleanupAllFiles();
            };

            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                cleanupAllFiles();
            };
        }, []);

        // Preview container wrapper component
        const PreviewContainer = ({ children }: { children: React.ReactNode; className?: string }) => (
            <div className={`d-flex border rounded position-relative align-items-center justify-content-center rounded overflow-hidden flex-shrink-0 ${isMultiple ? 'me-2' : ''}`}
                style={{
                    height: `${height}px`,
                    maxWidth: `${height}px`
                }}>
                {children}
            </div>
        );

        // Custom preview component
        const CustomPreview = (props: PreviewComponentProps) => {
            const { id, url, name, removePreview } = props;
            const metadata = fileMetadata.get(id);

            if (!metadata) {
                return null;
            }

            // Hook to abort upload
            const abortItem = useAbortItem();

            const handleCancel = () => {
                console.log('Cancelling upload for item id:', id);
                // Abort the upload
                abortItem(id);

                // Remove from preview
                removePreview?.();

                // Remove from progress
                setUploadProgress(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(id);
                    return newMap;
                });

                // Decrement counter
                uploadingCountRef.current = Math.max(0, uploadingCountRef.current - 1);

                toast.info('Upload cancelled');
            };

            const handleRemove = async () => {
                // Remove from preview
                removePreview?.();

                const metadata = fileMetadata.get(id);

                // Remove from metadata immediately
                setFileMetadata(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(id);
                    return newMap;
                });

                try {
                    await fetch(`/api/upload/temp/${metadata?.filename}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.error('Failed to delete temp file:', error);
                } finally {
                    // Remove from form value
                    const newValue = (isMultiple && Array.isArray(value)) ?
                        // Find and remove the filename associated with this preview item
                        // Note: We need to track the mapping between preview id and filename
                        value.filter((url: string) => url !== metadata?.url) :
                        null;

                    onChange?.(newValue);
                }
            };

            // Determine if file is an image
            const isImage = metadata?.mimetype?.startsWith('image/');

            // Get upload progress for this file
            const progress = uploadProgress.get(id);
            const isUploading = progress !== undefined;

            return (
                <PreviewContainer>
                    {/* Preview content */}
                    {isImage ? (
                        <img
                            className='object-fit-cover h-100'
                            src={url}
                            alt={name || 'Preview'}
                        />
                    ) : (
                        <div
                            className='d-flex flex-column align-items-center justify-content-center p-3 text-center w-100'
                            style={{
                                minWidth: `${height / 1.35}px`
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="64"
                                height="64"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                            >
                                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
                                <text
                                    x="50%"
                                    y="65%"
                                    textAnchor="middle"
                                    fontSize="3"
                                    fontWeight="bold"
                                    fill="currentColor"
                                >
                                    {(() => {
                                        const filename = metadata?.originalName || name || '';
                                        const parts = filename.split('.');
                                        return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
                                    })()}
                                </text>
                            </svg>
                            <div className='mt-2 small'>
                                {filesize(metadata?.size || 0, { base: 2, standard: "jedec" })}
                            </div>
                        </div>
                    )}

                    {/* Preview cancel button */}
                    <button
                        type='button'
                        className='btn btn-close bg-danger p-2 btn-sm position-absolute top-0 end-0 m-2'
                        aria-label='Close'
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isUploading) {
                                handleCancel();
                            } else {
                                handleRemove();
                            }
                        }}
                        title='Remove File'
                    />

                    {/* Preview footer (title/progress) */}
                    <div className='position-absolute bottom-0 start-0 end-0 bg-dark bg-opacity-75 text-white py-2 text-truncate small d-flex align-items-center'>
                        {isUploading && (
                            <div
                                className='progress rounded-0 position-absolute w-100 left-0 bottom-0'
                                style={{ height: '3px' }}
                            >
                                <div
                                    className='progress-bar progress-bar-striped progress-bar-animated bg-primary'
                                    role='progressbar'
                                    style={{ width: `${progress}%` }}
                                    aria-valuenow={progress}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                />
                            </div>
                        )}
                        <span className='px-3 w-100 d-inline-block text-truncate'>
                            {isUploading ? `${Math.round(progress || 0)}% - ` : ''}
                            {name}
                        </span>
                    </div>
                </PreviewContainer>
            );
        };

        return (
            <Uploady
                destination={{
                    url: '/api/upload/temp',
                    filesParamName: 'file'
                }}
                multiple={isMultiple}
                accept={accept}
                fileFilter={fileFilter}
                concurrent={isMultiple}
                maxConcurrent={maxFiles}
            >
                <UploadHandler onUploaded={(payload) => {
                    onChange?.(payload);
                }} />

                <UploadDropZone
                    className={`${className || ''}`}
                    onDragOverClassName='drag-over'
                >
                    <div
                        ref={scrollContainerRef}
                        className='d-flex align-items-center overflow-x-auto overflow-y-hidden'
                    >
                        <UploadPreview
                            rememberPreviousBatches={true}
                            PreviewComponent={CustomPreview}
                            fallbackUrl='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E'
                        />
                        {(!maxFiles || fileMetadata.size + uploadingCountRef.current < maxFiles) && (
                            <UploadButton
                                className='border-0 bg-transparent p-0 cursor-pointer flex-shrink-0'
                                extraProps={{ type: 'button' }}
                            >
                                <PreviewContainer>
                                    <div className='text-center p-3'>
                                        <div className='fw-bold'>Upload File</div>
                                        <div className='text-muted small mt-1'>Click or drag</div>
                                    </div>
                                </PreviewContainer>
                            </UploadButton>
                        )}
                    </div>
                </UploadDropZone>

                {/* Upload Preview for images */}
            </Uploady>
        );
    });

FileField.displayName = 'FileField';

export default FileField;
