"use client";

import { useState, type KeyboardEvent } from "react";
import { XIcon } from "lucide-react";

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
}

/**
 * Champ à puces : taper une valeur puis "Entrée" la transforme en chip
 * supprimable ; "Retour arrière" sur un champ vide retire la dernière chip.
 */
export function TagInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
}: TagInputProps) {
  const [text, setText] = useState("");

  function addTag() {
    const trimmed = text.trim();
    if (trimmed === "") return;
    const isDuplicate = value.some(
      (tag) => tag.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!isDuplicate) onChange([...value, trimmed]);
    setText("");
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    } else if (event.key === "Backspace" && text === "" && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div className="space-y-2">
      <input
        id={id}
        type="text"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          addTag();
          onBlur?.();
        }}
        className="h-auto w-full rounded-[9px] border-[1.5px] border-[#d5d5db] bg-[#fafafb] px-[14px] py-[11px] text-[13.5px] text-[#3a3a42] shadow-[inset_0_1px_2px_rgba(20,20,20,0.04)] outline-none placeholder:text-[#9a9aa3] focus-visible:border-[#7F1734]"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 rounded-[8px] border border-[#e6e6ea] bg-white py-1.5 pr-1.5 pl-3 text-[12px] font-bold text-[#3a3a42]"
            >
              {tag}
              <button
                type="button"
                aria-label={`Retirer ${tag}`}
                onClick={() => removeTag(index)}
                className="flex size-4 items-center justify-center rounded-full text-[#9a9aa3] transition-colors hover:bg-[#e6e6ea] hover:text-[#6b6b76]"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
