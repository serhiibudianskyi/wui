import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import type { FormClass, Section } from '../types/Form';
import type { FieldClass } from '../types/Field';
import Field from './Field';
import formTr from '../i18n/form';

interface FormProps {
    form: FormClass; // The form configuration
    onSubmit: (data: any) => Promise<void>; // The submit handler
    showReset?: boolean; // Whether to show the reset button
    language?: string; // Optional language for localization
    translations?: Record<string, string>; // Optional translations for the form
    className?: string; // Optional class name for the form
    isCard?: boolean; // Optional flag to indicate if the form should be displayed as a card
}

export default function Form({
    form,
    onSubmit,
    showReset = false,
    language = 'en',
    translations = {},
    className = '',
    isCard = true,
}: FormProps): JSX.Element {
    // Initialize react-hook-form with zod resolver
    const {
        register,
        handleSubmit,
        reset,
        trigger,
        clearErrors,
        control,
        formState: {
            touchedFields,
            errors,
            isSubmitting,
            isValid,
            isDirty
        }
    } = useForm({
        resolver: zodResolver(form.schema) as any,
        mode: 'onChange',
        defaultValues: form.defaultValues
    });

    const hasMounted = useRef(false);

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }

        void trigger(Object.keys(errors));
    }, [language]);

    // Language translations
    const tr = { ...formTr[language as keyof typeof formTr] || formTr['en'], ...translations };

    // Handle form submission
    const handleFormSubmit = async (data: any): Promise<void> => {
        try {
            await onSubmit(data);
            reset(data);
        } catch (error: any) {
            toast.error(tr.failed);
        }
    };

    const validateFormFields = async (field: FieldClass) => {
        const fieldNames = Object.values(form.sections)
            .flatMap(section => Object.values(section.fields))
            .map(f => f.name);
        const currentIndex = fieldNames.indexOf(field.name);

        // Trigger validation for all fields before the current one
        const beforeFields = fieldNames.slice(0, currentIndex + 1);

        beforeFields.forEach(name => trigger(name));

        // Clear errors for untouched fields after the current one
        const afterFields = fieldNames.slice(currentIndex + 1);
        const untouchedAfterFields = afterFields.filter(name => !touchedFields[name]);

        clearErrors(untouchedAfterFields);
    };

    const getFieldRegister = (field: FieldClass) => {
        const baseRegister = register(field.name, {
            valueAsNumber: field.type === 'number'
        });

        return {
            ...baseRegister,
            onFocus: async (_: any[]) => {
                // Call form field validations by a specific order
                await validateFormFields(field);
            },
            onChange: async (event: any) => {
                // Call the base onChange handler
                await baseRegister.onChange(event);

                // Trigger re-validation for specified fields
                for (const revalidateFieldName of field.revalidates) {
                    await trigger(revalidateFieldName);
                }
            },
        };
    };

    // Render a single field
    const renderField = (field: FieldClass) => {
        const fieldRegister = getFieldRegister(field);

        return (
            <Field
                key={field.name}
                field={field}
                register={fieldRegister}
                control={control}
                language={language}
            />
        );
    };

    // Render section
    const renderSection = (section: Section, index: number) => {
        return (
            <fieldset 
                key={section.title || index} 
                className={`${section.className || ''} ${section.title ? 'card' : ''}`}
            >
                {section.title &&
                    <div className='card-header'>
                        <h5 className='mb-0'>{section.title}</h5>
                    </div>
                }
                <div className={`row ${section.title ? 'card-body' : ''}`}>
                    {Object.values(section.fields).map(field => renderField(field))}
                </div>
            </fieldset>
        );
    };

    // Render form buttons
    const renderButtons = () => {
        return (
            <div className='my-2'>
                <button
                    type='submit'
                    className='btn btn-primary'
                    disabled={!isDirty || !isValid || isSubmitting}
                >
                    {isSubmitting ? tr.submitting : tr.submit}
                </button>
                {showReset && (
                    <button
                        type='button'
                        className='btn btn-secondary'
                        onClick={() => reset()}
                        disabled={!isDirty || isSubmitting}
                    >
                        {tr.reset}
                    </button>
                )}
            </div>
        );
    };

    return (
        <form
            className={`w-100 ${className}`}
            onSubmit={handleSubmit(handleFormSubmit)}
            noValidate
        >
            <div className={isCard ? 'card' : ''}>
                {form.title && (
                    <div className={isCard ? 'card-header' : ''}>
                        <h2 className='my-1'>{form.title}</h2>
                    </div>
                )}
                <div className={isCard ? 'card-body' : ''}>
                    {/* Render form fields */}
                    {form.sections.map((section, index) => renderSection(section, index))}
                </div>
                <div className={isCard ? 'card-footer' : ''}>
                    {/* Render buttons */}
                    {renderButtons()}
                </div>
            </div>
        </form>
    );
}
