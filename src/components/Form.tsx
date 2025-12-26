import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import type { Form as FormType, Section } from '../types/Form';
import type { Field as FieldType } from '../types/Field';
import Field from './Field';

interface FormProps {
    form: FormType; // The form configuration
    onSubmit: (data: any) => Promise<void>; // The submit handler
    showReset?: boolean; // Whether to show the reset button
}

export default function Form({ 
    form, 
    onSubmit,
    showReset = false
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
            isSubmitting, 
            isValid, 
            isDirty 
        }
    } = useForm({
        resolver: zodResolver(form.schema) as any,
        mode: 'onChange',
        defaultValues: form.defaultValues
    });

    // Handle form submission
    const handleFormSubmit = async (data: any): Promise<void> => {
        try {
            await onSubmit(data);
            reset(data);
        } catch (error: any) {
            toast.error('Form submission failed');
        }
    };

    const validateFormFields = async (field: FieldType) => {
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

    const getFieldRegister = (field: FieldType) => {
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
    const renderField = (field: FieldType) => {
        const fieldRegister = getFieldRegister(field);

        return (
            <Field
                key={field.name}
                field={field}
                register={fieldRegister}
                control={control}
            />
        );
    };

    // Render section
    const renderSection = (section: Section) => {
        return (
            <div className={`${section.className} mb-4`}>
                <div className='card'>
                    <div className='card-header'>
                        {section.title && <h3>{section.title}</h3>}
                    </div>
                    <div className='card-body'>
                <div className='row g-3'>
                    {Object.values(section.fields).map(field => renderField(field))}
                </div>
                </div>
            </div>
            </div>
        );
    };

    // Render form buttons
    const renderButtons = () => {
        return (
            <div className='d-flex gap-2'>
                <button 
                    type='submit' 
                    className='btn btn-primary' 
                    disabled={!isDirty || !isValid || isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
                {showReset && (
                    <button 
                        type='button' 
                        className='btn btn-secondary' 
                        onClick={() => reset()}
                        disabled={!isDirty || isSubmitting}
                    >
                        Reset
                    </button>
                )}
            </div>
        );    
    };

    return (
        <form 
            className='row'
            onSubmit={handleSubmit(handleFormSubmit)} 
            noValidate
        >
            {/* Render form fields */}
            {form.sections.map(section => renderSection(section))}
            {/* Render buttons */}
            {renderButtons()}
        </form>
    );
}