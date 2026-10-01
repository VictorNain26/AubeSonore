import { toast } from 'sonner';

export function toastError(message: string): void {
  toast.error(message, { duration: 8000 });
}
