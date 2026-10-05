# wui
Web User Interface library

## Modal

```tsx
import { Modal } from '@serhiibudianskyi/wui';

<Modal
	isOpen={isModalOpen}
	title="Confirm action"
	onClose={() => setIsModalOpen(false)}
	footer={<button className="btn btn-primary">Confirm</button>}
>
	Are you sure you want to continue?
</Modal>
```

The modal closes with Escape or a backdrop click by default. Set `size` to `sm`, `lg`, or `xl`, and use `centered` or `scrollable` for the corresponding Bootstrap layout options.

## Checkbox Trees

`FieldFactory.checkboxGroup` accepts `CheckboxOption[]`. Each option can contain
`children`; existing flat `Option[]` inputs remain supported. Values must be unique
within a group.

```tsx
import { FieldFactory, type CheckboxOption } from '@serhiibudianskyi/wui';

const options: CheckboxOption[] = [
	{
		label: 'Company',
		value: 'company',
		children: [
			{ label: 'General', value: 'company_general' },
			{ label: 'Roles', value: 'company_roles' },
		],
	},
];

const field = FieldFactory.checkboxGroup('permissions', 'Permissions', options);
```

Selecting a parent selects its entire branch. A parent is checked when all its
children are checked, and indeterminate when only some descendants are selected.
Branch arrows hide children without changing selection. The value remains a
`string[]` containing selected nodes; partially selected parents are not included.
A parent in the initial selection selects all its descendants.

The controlled `CheckboxGroup` component is also exported for use outside `Form`:

```tsx
<CheckboxGroup options={options} value={selected} onChange={setSelected} />
```
