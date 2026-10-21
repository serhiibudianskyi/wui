import { get, useForm } from "react-hook-form";
import { useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import type { FormClass, Section } from "../types/Form";
import type { FieldClass } from "../types/Field";
import Field from "./Field";
import formTr from "../i18n/form";
import type { FormLanguage } from "../i18n/field";

export type { FormLanguage } from "../i18n/field";

interface FormProps {
	form: FormClass; // The form configuration
	language?: FormLanguage;
	translations?: Partial<typeof formTr.en>;
	onSubmit: (data: any) => Promise<void>; // The submit handler
	onReset?: () => void;
	showReset?: boolean; // Whether to show the reset button
	allowPristineSubmit?: boolean;
	isCard?: boolean; // Whether the form should be displayed as a card
}

export default function Form({
	form,
	language = "en",
	translations = {},
	onSubmit,
	onReset,
	showReset = false,
	allowPristineSubmit = false,
	isCard = false,
}: FormProps): JSX.Element {
	const id = useId();
	const tr = { ...(formTr[language] || formTr.en), ...translations };
	// Initialize react-hook-form with zod resolver
	const {
		register,
		handleSubmit,
		reset,
		trigger,
		clearErrors,
		control,
		watch,
		formState: {
			touchedFields,
			isSubmitting,
			isValid,
			defaultValues,
			dirtyFields,
		},
	} = useForm({
		resolver: zodResolver(form.schema) as any,
		mode: "onChange",
		defaultValues: form.defaultValues,
	});

	const values = watch();
	const isFieldDirty = (field: FieldClass): boolean => {
		const value = get(values, field.name);
		const defaultValue = get(
			defaultValues ?? form.defaultValues,
			field.name,
		);

		if (
			["text", "textarea", "email", "password"].includes(field.type) &&
			typeof value === "string" &&
			typeof defaultValue === "string"
		) {
			return value.trim() !== defaultValue.trim();
		}

		return Boolean(get(dirtyFields, field.name));
	};
	const isDirty = form.sections.some((section) =>
		Object.values(section.fields).some(isFieldDirty),
	);

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
			.flatMap((section) => Object.values(section.fields))
			.map((f) => f.name);
		const currentIndex = fieldNames.indexOf(field.name);

		// Trigger validation for all fields before the current one
		const beforeFields = fieldNames.slice(0, currentIndex + 1);

		beforeFields.forEach((name) => trigger(name));

		// Clear errors for untouched fields after the current one
		const afterFields = fieldNames.slice(currentIndex + 1);
		const untouchedAfterFields = afterFields.filter(
			(name) => !touchedFields[name],
		);

		clearErrors(untouchedAfterFields);
	};

	const getFieldRegister = (field: FieldClass) => {
		const baseRegister = register(field.name, {
			valueAsNumber: field.type === "number",
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
				id={`${id}-${field.name}`}
				field={field}
				language={language}
				register={fieldRegister}
				control={control}
				isDirty={isFieldDirty(field)}
			/>
		);
	};

	// Render section
	const renderSection = (section: Section) => {
		return (
			<div
				className={`${section.className} mb-4 ${isCard ? "card-body" : ""}`}
			>
				<div className={`${section.title ? "card" : ""}`}>
					{section.title && (
						<div
							className={`${section.title ? "card-header" : ""}`}
						>
							<span className="card-title">{section.title}</span>
						</div>
					)}
					<div className={`${section.title ? "card-body" : ""}`}>
						<div className="row g-3">
							{Object.values(section.fields).map((field) =>
								renderField(field),
							)}
						</div>
					</div>
				</div>
			</div>
		);
	};

	// Render form buttons
	const renderButtons = () => {
		return (
			<div className={`d-flex gap-2 ${isCard ? "card-footer" : ""}`}>
				<button
					type="submit"
					className="btn btn-primary"
					disabled={
						(!allowPristineSubmit && !isDirty) ||
						!isValid ||
						isSubmitting
					}
				>
					{isSubmitting ? tr.submitting : tr.submit}
				</button>
				{showReset && (
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => {
							if (onReset) {
								onReset();
							} else {
								reset();
							}
						}}
						disabled={(!onReset && !isDirty) || isSubmitting}
					>
						{tr.reset}
					</button>
				)}
			</div>
		);
	};

	return (
		<form
			className={`row ${isCard ? "card" : ""}`}
			onSubmit={handleSubmit(handleFormSubmit)}
			noValidate
		>
			{/* Render form fields */}
			{form.sections.map((section) => renderSection(section))}
			{/* Render buttons */}
			{renderButtons()}
		</form>
	);
}
