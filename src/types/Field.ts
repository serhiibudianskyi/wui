import { z } from 'zod';

// Define possible field types
export type FieldType =
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'checkbox'
    | 'date'
    | 'datetime-local'
    | 'time'
    | 'radio'
    | 'select'
    | 'async-select'
    | 'creatable-select'
    | 'async-creatable-select'
    | 'textarea'
    | 'file';

// Option interface for select/radio fields
export interface Option {
    label: string;
    value: string;
}

// Configuration interface for a form field
export interface FieldConfig {
    // Basic properties
    type: FieldType;
    name: string;
    label: string;
    placeholder?: string;
    isReadOnly?: boolean;
    isDisabled?: boolean;
    isRequired?: boolean;
    min?: number | string;
    max?: number | string;
    revalidates?: string[]; // Names of fields to re-validate when this field changes
    // Number properties
    step?: number;
    // Select/radio properties
    options?: Option[];
    // Multiple selection
    isMultiple?: boolean;
    // File properties
    maxSize?: number; // in bytes
    accept?: string; // accepted file types (e.g., "image/*")
    maxFiles?: number; // maximum number of files for file upload fields
    // Async select properties
    loadOptions?: (search: string) => Promise<Option[]>;
    // Validation
    validate?: (values: Record<string, any>, ctx: z.RefinementCtx) => void;
    normalize?: (value: unknown) => unknown;
    // CSS class for the container
    className?: string;
    // Additional attributes
    attrs?: Record<string, any>;
}

// Field class representing a form field
export class Field<T = any> {
    // Configuration for the field
    protected readonly _config: FieldConfig = {} as FieldConfig;
    // Zod schema for the field
    public readonly schema: z.ZodSchema<T> = z.any();

    // Constructor to initialize the field with its configuration and schema
    constructor(config: FieldConfig, schema: z.ZodSchema<T>) {
        this._config = config;
        this.schema = schema;
    }

    get type() {
        return this._config.type;
    }

    get name() {
        return this._config.name;
    }

    get label() {
        return this._config.label;
    }

    get placeholder() {
        return this._config.placeholder || '';
    }

    get isReadOnly() {
        return this._config.isReadOnly || false;
    }

    get isDisabled() {
        return this._config.isDisabled || false;
    }

    get isRequired() {
        return this._config.isRequired || false;
    }

    get min() {
        return this._config.min;
    }

    get max() {
        return this._config.max;
    }

    get revalidates() {
        return this._config.revalidates || [];
    }

    get step() {
        return this._config.step;
    }

    get options() {
        return this._config.options || [];
    }

    get isMultiple() {
        return this._config.isMultiple || false;
    }

    get maxSize() {
        return this._config.maxSize;
    }

    get accept() {
        return this._config.accept;
    }
    
    get maxFiles() {
        return this.isMultiple ? this._config.maxFiles || +Infinity : 1;
    }

    get loadOptions() {
        return this._config.loadOptions;
    }

    get className() {
        return this._config.className || '';
    }

    get attrs() {
        return this._config.attrs || {};
    }

    // Normalize the input value based on the field's configuration
    getNormalizedValue(value: unknown): T {
        return this._config.normalize ? this._config.normalize(value) as T : (value as T);
    }

    // Run custom validation logic for the field
    runValidation(values: Record<string, any>, ctx: z.RefinementCtx): void {
        if (this._config.validate) {
            this._config.validate(values, ctx);
        }
    }

    // Get default value for the field based on its type
    getDefaultValue(): T {
        switch (this._config.type) {
            case 'file':
                return (this._config.isMultiple ? [] : null) as T;
            case 'number':
                return (this._config.min ?? 0) as T;
            case 'checkbox':
                return false as T;
            case 'date':
            case 'datetime-local':
                return new Date() as T;
            case 'time':
                return '00:00' as T;
            case 'select':
            case 'async-select':
            case 'creatable-select':
            case 'async-creatable-select':
                return (this._config.isMultiple ? [] : null) as T;
            case 'textarea':
            case 'text':
            case 'email':
            case 'password':
            case 'radio':
            default:
                return '' as T;
        }
    }
}

export class FieldFactory {
    // Create a Zod schema for string fields
    private static createStringSchema(config: FieldConfig): z.ZodString {
        let schema = z.string();

        // Apply required validation if specified
        if (config.isRequired) {
            schema = schema.nonempty({ message: `${config.label} is required` });
        }

        return schema;
    }

    // Create a Zod schema for email fields
    private static createEmailSchema(config: FieldConfig): z.ZodString {
        let schema = this.createStringSchema(config).email('Invalid email address');

        return schema;
    }

    // Create a text field with the given configuration
    static text(name: string, label: string, config: Partial<FieldConfig> = {}): Field<string> {
        const fieldConfig = {
            type: 'text' as FieldType,
            name,
            label,
            ...config
        };

        return new Field(fieldConfig, this.createStringSchema(fieldConfig));
    }

    // Create an email field with the given configuration
    static email(config: Partial<FieldConfig>): Field<string> {
        const fieldConfig = {
            type: 'email' as FieldType,
            name: config.name || 'email',
            label: config.label || 'Email',
            ...config
        };

        return new Field(fieldConfig, this.createEmailSchema(fieldConfig));
    }

    // Create a password field with the given configuration
    static password(config: Partial<FieldConfig>): Field<string> {
        const fieldConfig = {
            type: 'password' as FieldType,
            name: config.name || 'password',
            label: config.label || 'Password',
            ...config
        };

        return new Field(fieldConfig, this.createStringSchema(fieldConfig));
    }

    // Create a textarea field with the given configuration
    static textarea(name: string, label: string, config: Partial<FieldConfig> = {}): Field<string> {
        const fieldConfig = {
            type: 'textarea' as FieldType,
            name,
            label,
            ...config
        };

        return new Field(fieldConfig, this.createStringSchema(fieldConfig));
    }

    // Create a Zod schema for number fields
    private static createNumberSchema(config: FieldConfig): z.ZodType<number | undefined> {
        // Preprocess to handle empty strings and convert to number
        let schema = z.preprocess(
            (val) => {
                if (typeof val === 'string' && val.trim() === '' || isNaN(Number(val))) {
                    return undefined;
                }
                return Number(val);
            },
            z.number().optional() // It should be optional initially!
        );

        // Apply required and range validations if specified
        if (config.isRequired) {
            schema = schema.refine(
                (val) => val !== undefined, {
                message: `${config.label} is required`
            })
        }

        // Minmax value validation
        schema = schema
            .refine(
                (val) => {
                    if (val === undefined) return true;
                    if (typeof config.min === 'number') {
                        return val >= config.min;
                    }
                    return true;
                }, {
                message: `${config.label} must be at least ${config.min}`
            })
            .refine(
                (val) => {
                    if (val === undefined) return true;
                    if (typeof config.max === 'number') {
                        return val <= config.max;
                    }
                    return true;
                }, {
                message: `${config.label} must be at most ${config.max}`
            });

        return schema;
    }

    // Create a number field with the given configuration
    static number(name: string, label: string, config: Partial<FieldConfig> = {}): Field<number | undefined> {
        const fieldConfig = {
            type: 'number' as FieldType,
            name,
            label,
            ...config
        };

        return new Field(fieldConfig, this.createNumberSchema(fieldConfig));
    }

    // Create a Zod schema for checkbox fields
    private static createCheckboxSchema(config: FieldConfig): z.ZodType<boolean> {
        let schema = z.boolean();

        // Apply required validation if specified
        if (config.isRequired) {
            schema = schema.refine(
                (val) => val === true, {
                message: `${config.label} must be checked`
            });
        }

        return schema;
    }

    // Create a checkbox field with the given configuration
    static checkbox(name: string, label: string, config: Partial<FieldConfig> = {}): Field<boolean> {
        const fieldConfig = {
            type: 'checkbox' as FieldType,
            name,
            label,
            ...config
        };

        return new Field(fieldConfig, this.createCheckboxSchema(fieldConfig));
    }

    // Create a Zod schema for date fields
    private static createDateSchema(config: FieldConfig): z.ZodType<Date | undefined> {
        let schema = z.preprocess(
            (val) => {
                if (typeof val === 'string' || val instanceof Date) {
                    const date = new Date(val);
                    return isNaN(date.getTime()) ? undefined : date;
                }
                return undefined;
            },
            z.date().optional()
        );

        // Apply required validation if specified
        if (config.isRequired) {
            schema = schema.refine(
                (val) => val !== undefined, {
                message: `${config.label} is required`
            });
        }

        // Minmax date validation
        schema = schema
            .refine(
                (val) => {
                    if (val === undefined) return true;
                    if (typeof config.min === 'string') {
                        return val >= new Date(config.min);
                    }
                    return true;
                }, {
                message: `${config.label} must be on or after ${config.min ? new Date(config.min).toLocaleDateString() : ''}`
            })
            .refine(
                (val) => {
                    if (val === undefined) return true;
                    if (typeof config.max === 'string') {
                        return val <= new Date(config.max);
                    }
                    return true;
                }, {
                message: `${config.label} must be on or before ${config.max ? new Date(config.max).toLocaleDateString() : ''}`
            }
            );

        return schema;
    }

    // Create a date field with the given configuration
    static date(name: string, label: string, config: Partial<FieldConfig> = {}): Field<Date | undefined> {
        const fieldConfig = {
            type: 'date' as FieldType,
            name,
            label,
            ...config
        };

        return new Field(fieldConfig, this.createDateSchema(fieldConfig));
    }

    // Create a Zod schema for datetime-local fields
    private static createDateTimeLocalSchema(config: FieldConfig): z.ZodType<Date | undefined> {
        let schema = z.preprocess(
            (val) => {
                if (typeof val === 'string' || val instanceof Date) {
                    const date = new Date(val);
                    return isNaN(date.getTime()) ? undefined : date;
                }
                return undefined;
            },
            z.date().optional()
        );

        // Apply required validation if specified
        if (config.isRequired) {
            schema = schema.refine(
                (val) => val !== undefined, {
                message: `${config.label} is required`
            });
        }

        // Minmax datetime validation
        schema = schema
            .refine(
                (val) => {
                    if (val === undefined) return true;
                    if (typeof config.min === 'string') {
                        return val >= new Date(config.min);
                    }
                    return true;
                }, {
                message: `${config.label} must be on or after ${config.min ? new Date(config.min).toLocaleString() : ''}`
            })
            .refine(
                (val) => {
                    if (val === undefined) return true;
                    if (typeof config.max === 'string') {
                        return val <= new Date(config.max);
                    }
                    return true;
                }, {
                message: `${config.label} must be on or before ${config.max ? new Date(config.max).toLocaleString() : ''}`
            }
            );

        return schema;
    }

    // Create a datetime-local field with the given configuration
    static datetimeLocal(name: string, label: string, config: Partial<FieldConfig> = {}): Field<Date | undefined> {
        const fieldConfig = {
            type: 'datetime-local' as FieldType,
            name,
            label,
            ...config
        };

        return new Field(fieldConfig, this.createDateTimeLocalSchema(fieldConfig));
    }

    // Create a Zod schema for time fields
    private static createTimeSchema(config: FieldConfig): z.ZodType<string | undefined> {
        let schema = z.string().optional();

        // Apply required validation if specified
        if (config.isRequired) {
            schema = schema.refine(
                (val) => val !== undefined && val !== '', {
                message: `${config.label} is required`
            });
        }

        // Validate time format (HH:MM)
        schema = schema.refine(
            (val) => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
            message: `${config.label} must be a valid time in HH:MM format`
        });

        // Minmax time validation
        schema = schema
            .refine(
                (val) => {
                    if (!val) return true;
                    if (typeof config.min === 'string') {
                        return val >= config.min;
                    }
                    return true;
                }, {
                message: `${config.label} must be at or after ${config.min}`
            })
            .refine(
                (val) => {
                    if (!val) return true;
                    if (typeof config.max === 'string') {
                        return val <= config.max;
                    }
                    return true;
                }, {
                message: `${config.label} must be at or before ${config.max}`
            }
            );

        return schema;
    }

    // Create a time field with the given configuration
    static time(name: string, label: string, config: Partial<FieldConfig> = {}): Field<string | undefined> {
        const fieldConfig = {
            type: 'time' as FieldType,
            name,
            label,
            ...config
        };

        return new Field(fieldConfig, this.createTimeSchema(fieldConfig));
    }

    // Create a radio field with the given configuration
    static radio(name: string, label: string, options: Option[], config: Partial<FieldConfig> = {}): Field<string> {
        const fieldConfig = {
            type: 'radio' as FieldType,
            name,
            label,
            options,
            ...config
        };

        return new Field(fieldConfig, this.createStringSchema(fieldConfig));
    }

    // Create a Zod schema for select fields
    private static createSelectSchema(config: FieldConfig): z.ZodType<Option | Option[] | null> {
        if (config.isMultiple) {
            // Array schema for multi-select
            let schema = z.array(z.object({
                label: z.string(),
                value: z.string()
            }));

            // Apply required validation
            if (config.isRequired) {
                schema = schema.nonempty({ message: `${config.label} is required` });
            }

            return schema.default([]);
        } else {
            // For single-select, return an Option object or null
            let schema = z.object({
                label: z.string(),
                value: z.string()
            }).nullable().default(null);

            // Apply required validation
            if (config.isRequired) {
                schema = schema.refine(
                    (val) => val !== null,
                    { message: `${config.label} is required` }
                );
            }

            return schema;
        }
    }

    // Create a select field with the given configuration
    static select(name: string, label: string, options: Option[], config: Partial<FieldConfig> = {}): Field<Option | Option[] | null> {
        const fieldConfig = {
            type: 'select' as FieldType,
            name,
            label,
            options,
            ...config
        };

        return new Field(fieldConfig, this.createSelectSchema(fieldConfig));
    }

    // Create an async-select field with the given configuration
    static asyncSelect(name: string, label: string, loadOptions: (search: string) => Promise<Option[]>, config: Partial<FieldConfig> = {}): Field<Option | Option[] | null> {
        const fieldConfig = {
            type: 'async-select' as FieldType,
            name,
            label,
            loadOptions,
            ...config
        };

        return new Field(fieldConfig, this.createSelectSchema(fieldConfig));
    }

    // Create a creatable-select field with the given configuration
    static creatableSelect(name: string, label: string, options: Option[], config: Partial<FieldConfig> = {}): Field<Option | Option[] | null> {
        const fieldConfig = {
            type: 'creatable-select' as FieldType,
            name,
            label,
            options,
            ...config
        };

        return new Field(fieldConfig, this.createSelectSchema(fieldConfig));
    }

    // Create an async-creatable-select field with the given configuration
    static asyncCreatableSelect(name: string, label: string, loadOptions: (search: string) => Promise<Option[]>, config: Partial<FieldConfig> = {}): Field<Option | Option[] | null> {
        const fieldConfig = {
            type: 'async-creatable-select' as FieldType,
            name,
            label,
            loadOptions,
            ...config
        };

        return new Field(fieldConfig, this.createSelectSchema(fieldConfig));
    }

    private static createFileSchema(config: FieldConfig): z.ZodType<string | string[] | null> {
        if (config.isMultiple) {
            // Array schema for multiple files
            let schema = z.array(z.string());

            // Apply required validation
            if (config.isRequired) {
                schema = schema.nonempty({ message: `${config.label} is required` });
            }

            // Apply maxFiles validation
            if (config.maxFiles) {
                schema = schema.max(config.maxFiles, {
                    message: `${config.label} cannot have more than ${config.maxFiles} file${config.maxFiles > 1 ? 's' : ''}`
                });
            }

            return schema.default([]);
        } else {
            // For single file, return a string (file ID) or null
            let schema = z.string().nullable().default(null);

            // Apply required validation
            if (config.isRequired) {
                schema = schema.refine(
                    (val) => val !== null,
                    { message: `${config.label} is required` }
                );
            }

            return schema;
        }
    }

    // Create a file field with the given configuration
    static file(name: string, label: string, config: Partial<FieldConfig> = {}): Field<string | string[] | null> {
        const fieldConfig = {
            type: 'file' as FieldType,
            name,
            label,
            ...config
        };

        return new Field(fieldConfig, this.createFileSchema(fieldConfig));
    }
}