import { UseFormRegisterReturn, Control, useController } from 'react-hook-form';
import type { FieldClass, Option } from '../types/Field';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import CreatableSelect from 'react-select/creatable';
import AsyncCreatableSelect from 'react-select/async-creatable';
import FileField from './FileField';
import '../styles/bootstrap-ext.css';

interface FieldProps {
    field: FieldClass; // The field configuration
    register: UseFormRegisterReturn; // Registration object from react-hook-form
    control: Control<any>; // Control object from react-hook-form
}

export default function Field({
    field,
    register,
    control,
}: FieldProps): JSX.Element {
    const containerClasses: string[] = [];

    // Get field state from react-hook-form
    const { field: controllerField, fieldState } = useController({
        name: field.name,
        control
    });

    // Base properties for the input element
    const baseProps: any = {
        ...register,
        type: field.type,
        id: field.name,
        name: field.name,
        placeholder: field.placeholder,
        readOnly: field.isReadOnly,
        disabled: field.isDisabled,
        required: field.isRequired,
        min: field.min,
        max: field.max,
        className: '',
        ...field.attrs
    };

    // Adjust properties based on field type
    switch (field.type) {
        case 'async-select':
        case 'async-creatable-select':
            baseProps.loadOptions = field.loadOptions;
        // fallthrough
        case 'creatable-select':
        case 'select':
            baseProps.className = 'form-control';
            baseProps.options = field.options;
            baseProps.value = field.isMultiple ?
                (Array.isArray(controllerField.value) ? controllerField.value : []) :
                (controllerField.value ?? null);
            baseProps.onChange = (option: Option | Option[] | null) => {
                let value;

                if (field.isMultiple) {
                    value = option ? (option as Option[]) : [];
                } else {
                    value = option ? (option as Option) : null;
                }

                controllerField.onChange(value);
            };
            baseProps.styles = {
                container: (base: any) => ({
                    ...base,
                    padding: 0
                }),
                control: (base: any) => ({
                    ...base,
                    border: 'none',
                    boxShadow: 'none'
                })
            };
            break;
        case 'file':
            baseProps.className = 'form-control';
            baseProps.accept = field.accept;
            baseProps.isMultiple = field.isMultiple;
            if (!baseProps.isMultiple) {
                containerClasses.push('col-auto');
            }
            baseProps.maxFiles = field.maxFiles;
            baseProps.maxSize = field.maxSize;
            baseProps.onChange = (fileIds: string | string[] | null) => {
                controllerField.onChange(fileIds);
            }
            break;
        case 'radio':
        case 'checkbox':
            baseProps.className = 'form-check-input';
            containerClasses.push('mx-2', 'form-check', 'form-switch');
            break;
        case 'number':
            baseProps.step = field.step;
        // fallthrough
        case 'date':
        case 'datetime-local':
        case 'time':
            containerClasses.push('col-auto');
        // fallthrough
        case 'text':
        case 'email':
        case 'password':
        default:
            baseProps.className = 'form-control';
            // Override onChange to include string normalization on real-time input
            baseProps.onInput = async (event: any) => {
                // Apply normalization
                const normalizedValue = field.getNormalizedValue(event.target.value);
                event.target.value = normalizedValue;

                // Call the original onChange
                return register.onChange(event);
            }
            break;
    }

    // Add validation classes
    if (fieldState.error) {
        baseProps.className += ' is-invalid';
    } else if (!baseProps.className.includes('form-check-input') && (fieldState.isTouched || fieldState.isDirty)) {
        baseProps.className += ' is-valid';
    }

    // Render the label for the field
    const renderLabel = (): JSX.Element => (
        <label
            htmlFor={field.name}
            className='form-label'
        >
            {field.label} {field.isRequired &&
                <span
                    className='text-danger'
                    title='Field is required'
                >
                    *
                </span>}
        </label>
    );

    // Render the input element based on the field type
    const renderInput = (): JSX.Element => {
        switch (field.type) {
            case 'select':
                return (
                    <Select
                        {...controllerField}
                        {...baseProps}
                    />
                );
            case 'async-select':
                return (
                    <AsyncSelect
                        {...controllerField}
                        {...baseProps}
                    />
                );
            case 'creatable-select':
                return (
                    <CreatableSelect
                        {...controllerField}
                        {...baseProps}
                    />
                );
            case 'async-creatable-select':
                return (
                    <AsyncCreatableSelect
                        {...controllerField}
                        {...baseProps}
                    />
                );
            case 'radio':
                return (
                    <>
                        {field.options?.map((option) => (
                            <div key={option.value}>
                                <input
                                    {...baseProps}
                                    id={`${field.name}_${option.value}`} // Override uniqueid for each option
                                    value={option.value}
                                />
                                <label htmlFor={`${field.name}_${option.value}`}>
                                    {option.label}
                                </label>
                            </div>
                        ))}
                    </>
                );
            case 'textarea':
                return <textarea {...baseProps} />;
            case 'file':
                return <FileField 
                    {...controllerField} 
                    {...baseProps} 
                />;
            case 'checkbox':
            case 'number':
            case 'date':
            case 'datetime-local':
            case 'time':
            case 'text':
            case 'email':
            case 'password':
            default:
                return <input {...baseProps} />;
        }
    };

    // Render validation error message
    const renderError = (): JSX.Element | null => {
        if (!fieldState.error) {
            return null;
        }

        return (
            <div className='invalid-feedback d-block'>
                {fieldState.error.message}
            </div>
        );
    }

    // Combine container classes into a single string
    containerClasses.push(field.className); // Add field-specific className in the end to override defaults
    const containerClassNames = containerClasses.filter(Boolean).join(' ');
    return (
        <div className={containerClassNames}>
            {renderLabel()}
            {renderInput()}
            {renderError()}
        </div>
    );
}
