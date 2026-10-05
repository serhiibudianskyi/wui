import { useEffect, useId, useRef, useState } from 'react';
import type { CheckboxOption } from '../types/Field';

function visitOptions(options: CheckboxOption[], visit: (option: CheckboxOption) => void) {
    options.forEach((option) => {
        visit(option);
        visitOptions(option.children ?? [], visit);
    });
}

function reconcileSelection(options: CheckboxOption[], selected: Set<string>) {
    options.forEach((option) => {
        const children = option.children ?? [];
        reconcileSelection(children, selected);
        if (children.length > 0) {
            if (children.every((child) => selected.has(child.value))) selected.add(option.value);
            else selected.delete(option.value);
        }
    });
}

export function getCheckboxSelection(options: CheckboxOption[], values: string[]): string[] {
    const selected = new Set(values);
    visitOptions(options, (option) => {
        if (selected.has(option.value)) {
            visitOptions(option.children ?? [], (child) => selected.add(child.value));
        }
    });
    reconcileSelection(options, selected);
    return [...selected];
}

export function toggleCheckboxOption(options: CheckboxOption[], values: string[], value: string, checked: boolean): string[] {
    const selected = new Set(getCheckboxSelection(options, values));
    visitOptions(options, (option) => {
        if (option.value !== value) return;
        visitOptions([option], (child) => {
            if (checked) selected.add(child.value);
            else selected.delete(child.value);
        });
    });
    reconcileSelection(options, selected);
    return [...selected];
}

interface CheckboxNodeProps {
    option: CheckboxOption;
    selected: Set<string>;
    disabled: boolean;
    groupId: string;
    onToggle: (value: string, checked: boolean) => void;
    onBlur?: () => void;
}

function CheckboxNode({ option, selected, disabled, groupId, onToggle, onBlur }: CheckboxNodeProps) {
    const [expanded, setExpanded] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const children = option.children ?? [];
    const checked = selected.has(option.value);
    let hasSelectedDescendant = false;
    visitOptions(children, (child) => {
        if (selected.has(child.value)) hasSelectedDescendant = true;
    });
    const mixed = !checked && hasSelectedDescendant;
    const inputId = `${groupId}-${encodeURIComponent(option.value)}`;
    const childrenId = `${inputId}-children`;

    useEffect(() => {
        if (inputRef.current) inputRef.current.indeterminate = mixed;
    }, [mixed, checked]);

    return (
        <div>
            <div className="d-flex align-items-start gap-2">
                {children.length > 0 && (
                    <button
                        type="button"
                        className="btn btn-sm p-0 flex-shrink-0"
                        style={{ width: '1.25rem', height: '1.5rem' }}
                        aria-expanded={expanded}
                        aria-controls={childrenId}
                        aria-label={option.label}
                        title={option.label}
                        onClick={() => setExpanded((current) => !current)}
                    >
                        <i className={`bi bi-chevron-${expanded ? 'down' : 'right'}`} aria-hidden="true" />
                    </button>
                )}
                <div className="form-check mb-0" style={{ minWidth: 0 }}>
                    <input
                        ref={inputRef}
                        type="checkbox"
                        className="form-check-input"
                        id={inputId}
                        checked={checked}
                        aria-checked={mixed ? 'mixed' : checked}
                        disabled={disabled}
                        onBlur={onBlur}
                        onChange={(event) => onToggle(option.value, event.target.checked)}
                    />
                    <label className="form-check-label text-break" htmlFor={inputId}>{option.label}</label>
                </div>
            </div>
            {children.length > 0 && (
                <div id={childrenId} hidden={!expanded} className="ms-3 ps-3 border-start">
                    <div className="d-flex flex-column gap-2 py-2">
                        {children.map((child) => (
                            <CheckboxNode key={child.value} option={child} selected={selected} disabled={disabled}
                                groupId={groupId} onToggle={onToggle} onBlur={onBlur} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CheckboxGroup({ options, value, disabled = false, onChange, onBlur }: {
    options: CheckboxOption[];
    value: string[];
    disabled?: boolean;
    onChange: (value: string[]) => void;
    onBlur?: () => void;
}) {
    const groupId = useId();
    const selected = new Set(getCheckboxSelection(options, value));
    const onToggle = (optionValue: string, checked: boolean) => {
        onChange(toggleCheckboxOption(options, value, optionValue, checked));
    };

    return <>{options.map((option) => (
        <CheckboxNode key={option.value} option={option} selected={selected} disabled={disabled}
            groupId={groupId} onToggle={onToggle} onBlur={onBlur} />
    ))}</>;
}