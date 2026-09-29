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
