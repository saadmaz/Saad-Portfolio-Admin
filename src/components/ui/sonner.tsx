import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "group toast group-[.toaster]:rounded-xl group-[.toaster]:border-border group-[.toaster]:bg-popover group-[.toaster]:text-foreground group-[.toaster]:shadow-xl group-[.toaster]:font-sans",
        description: "group-[.toast]:font-mono group-[.toast]:text-[12px] group-[.toast]:text-muted-foreground",
        actionButton: "group-[.toast]:bg-transparent group-[.toast]:font-medium group-[.toast]:text-accent",
        cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-muted-foreground",
        success: "group-[.toaster]:[&_[data-icon]]:text-success-fg",
        error: "group-[.toaster]:[&_[data-icon]]:text-danger-fg",
      },
    }}
    {...props}
  />
);

export { Toaster, toast };
