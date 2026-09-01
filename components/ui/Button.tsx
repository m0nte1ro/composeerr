import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "text";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  text: "text-button",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");

  return <button type={type} className={classes} {...props} />;
}
