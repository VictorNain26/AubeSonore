import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';

export interface ModalWrapperProps {
  isOpen: boolean;
  onRequestClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onRequestClose,
  title,
  description,
  children,
  className,
}) => (
  <Dialog open={isOpen} onOpenChange={onRequestClose}>
    <DialogContent className={className}>
      {title && (
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
      )}
      {children}
    </DialogContent>
  </Dialog>
);
