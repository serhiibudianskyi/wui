import { z } from 'zod';
import { Field } from './Field';

export interface Section {
    title?: string;
    fields: Record<string, Field<any>>;
    className?: string;
}

export class Form {
    // Form fields
    private _fields: Record<string, Field<any>> = {};
    // Zod schema for the form
    private _schema: z.ZodSchema<any> | null = null;
    // Default values for the form
    private _defaultValues: Record<string, any> = {};
    // Sections of the form
    private _sections: Section[] = [];

    // Alternative constructor to initialize the form with sections
    constructor(sections: Section[]) {
        this._sections = sections;
        this._fields = this._extractFieldsFromSections();
        this._buildDefaultValues();
    }

    get sections(): Section[] {
        return this._sections;
    }

    get schema(): z.ZodObject<any> {
        // Build the schema if it hasn't been built yet
        if (!this._schema) {
            this._schema = this._buildSchema();
        }

        return this._schema as z.ZodObject<any>;
    }

    // Get default values for the form
    get defaultValues(): Record<string, any> {
        return this._defaultValues;
    }

    // Set default values for the form
    setDefaultValues(values: Record<string, any>): void {
        this._defaultValues = { ...this._defaultValues, ...values };
    }

    // Build the Zod schema for the form based on its fields
    private _buildSchema(): z.ZodObject<any> {
        const shape: Record<string, z.ZodTypeAny> = {};

        // Iterate over each field to build its schema
        for (const [name, field] of Object.entries(this._fields)) {
            let schema = field.schema;

            // Wrap the schema with preprocessing to normalize the value
            schema = z.preprocess(field.getNormalizedValue.bind(field), schema);
    
            shape[name] = schema;
        }
        
        // Return the combined schema with custom refinements callback
        return z.object(shape).superRefine((values, ctx) => {
            for (const field of Object.values(this._fields)) {
                field.runValidation(values, ctx);
            }
        });
    }

    // Build default values for the form based on its fields
    private _buildDefaultValues(): void {
        this._defaultValues = {};

        for (const [key, field] of Object.entries(this._fields)) {
            this._defaultValues[key] = field.getDefaultValue();
        }
    }

    // Extract fields from sections
    private _extractFieldsFromSections(): Record<string, Field<any>> {
        const fields: Record<string, Field<any>> = {};

        for (const section of this._sections) {
            Object.assign(fields, section.fields);
        }

        return fields;
    }
}

export class FormBuilder {
    // Set of sections of fields for the form
    private _sections: Section[] = [];
    // Default values for the form
    private _defaultValues: Record<string, any> = {};

    // Add a section to the form
    section(section: Section): this {
        this._sections.push(section);
        
        // Extract default values from section fields
        for (const [name, field] of Object.entries(section.fields)) {
            this._defaultValues[name] = field.getDefaultValue();
        }

        return this;
    }

    // Add multiple sections to the form
    sections(sections: Section[]): this {
        for (const section of sections) {
            this.section(section);
        }

        return this;
    }

    // Set default values for the form
    defaultValues(values: Record<string, any>): this {
        this._defaultValues = { ...this._defaultValues, ...values };

        return this;
    }

    // Build and return the form instance
    build(): Form {
        const form = new Form(this._sections);
        
        form.setDefaultValues(this._defaultValues);

        return form;
    }
}