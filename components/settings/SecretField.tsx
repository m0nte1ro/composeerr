import { Input } from "@/components/ui/Input";

type SecretFieldProps = {
  id: string;
  hasSavedValue: boolean;
  isEditing: boolean;
  showValue: boolean;
  value: string;
  placeholder: string;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onToggleVisibility: () => void;
  onChange: (value: string) => void;
};

export function SecretField({
  id,
  hasSavedValue,
  isEditing,
  showValue,
  value,
  placeholder,
  onStartEditing,
  onCancelEditing,
  onToggleVisibility,
  onChange,
}: SecretFieldProps) {
  if (hasSavedValue && !isEditing) {
    return (
      <div className="secret-input">
        <Input
          id={id}
          type="text"
          value="••••••••••••••••"
          readOnly
          aria-label="Saved Lidarr API key"
        />

        <button type="button" onClick={onStartEditing}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="secret-input">
      <Input
        id={id}
        type={showValue ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />

      <button type="button" onClick={onToggleVisibility}>
        {showValue ? "Hide" : "Show"}
      </button>

      {hasSavedValue && (
        <button type="button" onClick={onCancelEditing}>
          Cancel
        </button>
      )}
    </div>
  );
}
