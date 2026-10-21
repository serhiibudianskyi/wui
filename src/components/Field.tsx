import { UseFormRegisterReturn, Control, useController } from "react-hook-form";
import type { FieldClass, Option } from "../types/Field";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import CreatableSelect from "react-select/creatable";
import AsyncCreatableSelect from "react-select/async-creatable";
import FileField from "./FileField";
import "../styles/bootstrap-ext.css";
import fieldTr, { type FormLanguage } from "../i18n/field";

interface FieldProps {
	id?: string;
	language?: FormLanguage;
	isDirty?: boolean;
	field: FieldClass; // The field configuration
	register: UseFormRegisterReturn; // Registration object from react-hook-form
	control: Control<any>; // Control object from react-hook-form
}

export default function Field({
	id,
	language = "en",
	isDirty,
	field,
	register,
	control,
}: FieldProps): JSX.Element {
	const inputId = id ?? field.name;
	const tr = fieldTr[language] || fieldTr.en;
	const label =
		field.type === "email" && field.label === "Email"
			? tr.email
			: field.type === "password" && field.label === "Password"
				? tr.password
				: field.label;
	const containerClasses: string[] = [];

	// Get field state from react-hook-form
	const { field: controllerField, fieldState } = useController({
		name: field.name,
		control,
	});

	// Base properties for the input element
	const baseProps: any = {
		...register,
		type: field.type,
		id: inputId,
		name: field.name,
		placeholder: field.placeholder,
		readOnly: field.isReadOnly,
		disabled: field.isDisabled,
		required: field.isRequired,
		min: field.min,
		max: field.max,
		className: "",
		...field.attrs,
	};

	// Adjust properties based on field type
	switch (field.type) {
		case "async-select":
		case "async-creatable-select":
			baseProps.loadOptions = field.loadOptions;
		// fallthrough
		case "creatable-select":
		case "select":
			baseProps.className = "form-control";
			baseProps.options = field.options;
			baseProps.value = field.isMultiple
				? Array.isArray(controllerField.value)
					? controllerField.value
					: []
				: (controllerField.value ?? null);
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
					padding: 0,
				}),
				control: (base: any) => ({
					...base,
					border: "none",
					boxShadow: "none",
				}),
			};
			break;
		case "file":
			baseProps.className = "form-control";
			baseProps.accept = field.accept;
			baseProps.isMultiple = field.isMultiple;
			if (!baseProps.isMultiple) {
				containerClasses.push("col-auto");
			}
			baseProps.maxFiles = field.maxFiles;
			baseProps.maxSize = field.maxSize;
			baseProps.onChange = (fileIds: string | string[] | null) => {
				controllerField.onChange(fileIds);
			};
			break;
		case "radio":
		case "checkbox":
			baseProps.className = "form-check-input";
			containerClasses.push("mx-2", "form-check", "form-switch");
			break;
		case "number":
			baseProps.step = field.step;
		// fallthrough
		case "date":
		case "datetime-local":
		case "time":
			containerClasses.push("col-auto");
		// fallthrough
		case "text":
		case "email":
		case "password":
		default:
			baseProps.className = "form-control";
			// Override onChange to include string normalization on real-time input
			baseProps.onInput = async (event: any) => {
				// Apply normalization
				const input = event.target;
				const value = input.value;
				const normalizedValue = field.getInputValue(value);
				if (normalizedValue !== value) {
					const start = input.selectionStart;
					const end = input.selectionEnd;
					const direction = input.selectionDirection;
					input.value = normalizedValue;
					if (start !== null && end !== null) {
						input.setSelectionRange(
							String(field.getInputValue(value.slice(0, start)))
								.length,
							String(field.getInputValue(value.slice(0, end)))
								.length,
							direction,
						);
					}
				}

				// Call the original onChange
				return register.onChange(event);
			};
			break;
	}

	// Add validation classes
	if (fieldState.error) {
		baseProps.className += " is-invalid";
	} else if (
		!baseProps.className.includes("form-check-input") &&
		(fieldState.isTouched || (isDirty ?? fieldState.isDirty))
	) {
		baseProps.className += " is-valid";
	}

	// Render the label for the field
	const renderLabel = (): JSX.Element => (
		<label htmlFor={inputId} className="form-label">
			{label}{" "}
			{field.isRequired && (
				<span className="text-danger" title={tr.required}>
					*
				</span>
			)}
		</label>
	);

	// Render the input element based on the field type
	const renderInput = (): JSX.Element => {
		switch (field.type) {
			case "select":
				return <Select {...controllerField} {...baseProps} />;
			case "async-select":
				return <AsyncSelect {...controllerField} {...baseProps} />;
			case "creatable-select":
				return <CreatableSelect {...controllerField} {...baseProps} />;
			case "async-creatable-select":
				return (
					<AsyncCreatableSelect {...controllerField} {...baseProps} />
				);
			case "radio":
				return (
					<>
						{field.options?.map((option) => (
							<div key={option.value}>
								<input
									{...baseProps}
									id={`${inputId}_${option.value}`}
									value={option.value}
								/>
								<label htmlFor={`${inputId}_${option.value}`}>
									{option.label}
								</label>
							</div>
						))}
					</>
				);
			case "textarea":
				return <textarea {...baseProps} />;
			case "file":
				return <FileField {...controllerField} {...baseProps} />;
			case "checkbox":
			case "number":
			case "date":
			case "datetime-local":
			case "time":
			case "text":
			case "email":
			case "password":
			default:
				return <input {...baseProps} />;
		}
	};

	// Render validation error message
	const renderError = (): JSX.Element | null => {
		if (!fieldState.error) {
			return null;
		}

		const message = fieldState.error.message || "";
		const template = Object.prototype.hasOwnProperty.call(tr, message)
			? tr[message as keyof typeof tr]
			: message;
		const formatLimit = (value: number | string | undefined): string => {
			if (
				typeof value === "string" &&
				(field.type === "date" || field.type === "datetime-local")
			) {
				return field.type === "date"
					? new Date(value).toLocaleDateString(language)
					: new Date(value).toLocaleString(language);
			}
			return value?.toString() ?? "";
		};
		const pairs: Record<string, string> = {
			label,
			min: formatLimit(field.min),
			max: formatLimit(field.max),
			maxFiles: field.maxFiles.toString(),
		};
		const translated = template.replace(
			/\{\{(\w+)\}\}/g,
			(placeholder, key: string) => pairs[key] ?? placeholder,
		);

		return <div className="invalid-feedback d-block">{translated}</div>;
	};

	// Combine container classes into a single string
	containerClasses.push(field.className); // Add field-specific className in the end to override defaults
	const containerClassNames = containerClasses.filter(Boolean).join(" ");
	return (
		<div className={containerClassNames}>
			{renderLabel()}
			{renderInput()}
			{renderError()}
		</div>
	);
}
