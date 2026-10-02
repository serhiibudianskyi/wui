import { useEffect, useId, type MouseEvent, type ReactNode } from 'react';

export interface ModalProps {
    isOpen: boolean;
    title: ReactNode;
    children: ReactNode;
    onClose: () => void;
    footer?: ReactNode;
    size?: 'sm' | 'lg' | 'xl';
    centered?: boolean;
    scrollable?: boolean;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    closeLabel?: string;
}

export default function Modal({
    isOpen,
    title,
    children,
    onClose,
    footer,
    size,
    centered = false,
    scrollable = false,
    closeOnBackdrop = true,
    closeOnEscape = true,
    closeLabel = 'Close',
}: ModalProps): JSX.Element | null {
    const titleId = useId();

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (closeOnEscape && event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, closeOnEscape, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
            onClose();
        }
    };

    const dialogClasses = [
        'modal-dialog',
        size ? `modal-${size}` : '',
        centered ? 'modal-dialog-centered' : '',
        scrollable ? 'modal-dialog-scrollable' : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            <div className="modal-backdrop show" aria-hidden="true" />
            <div
                className="modal d-block"
                tabIndex={-1}
                role="presentation"
                onMouseDown={handleBackdropClick}
            >
                <div
                    className={dialogClasses}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                >
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title fs-5" id={titleId}>{title}</h2>
                            <button
                                type="button"
                                className="btn-close"
                                aria-label={closeLabel}
                                onClick={onClose}
                            />
                        </div>
                        <div className="modal-body">{children}</div>
                        {footer && <div className="modal-footer">{footer}</div>}
                    </div>
                </div>
            </div>
        </>
    );
}