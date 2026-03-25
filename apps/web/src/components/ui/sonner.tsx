import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      offset={{ top: 88, right: 16, left: 16, bottom: 16 }}
      mobileOffset={{ top: 76, right: 12, left: 12, bottom: 12 }}
      expand={false}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-border/70 group-[.toaster]:bg-background/92 group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_26px_80px_-30px_rgba(15,23,42,0.42)] group-[.toaster]:backdrop-blur-xl dark:group-[.toaster]:shadow-[0_26px_80px_-30px_rgba(1,8,24,0.88)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
