import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'

import styles from './Checkbox.module.css'

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'type' | 'size' | 'style'
> & {
  label: ReactNode
  /** Guidance shown before input, always visible regardless of `error` (WCAG 3.3.2). */
  description?: ReactNode
  helperText?: ReactNode
  error?: boolean
  inputRef?: Ref<HTMLInputElement>
  className?: string
}

export function Checkbox({
  label,
  description,
  helperText,
  error = false,
  inputRef,
  id,
  className,
  ...props
}: CheckboxProps) {
  const generatedId = useId()
  const checkboxId = id ?? generatedId
  const descriptionId = `${checkboxId}-description`
  const errorId = `${checkboxId}-error`

  const showDescription = Boolean(description)
  const showHelper = Boolean(helperText) && (error || !description)
  const helperIsError = showHelper && error
  const helperId = helperIsError ? errorId : descriptionId

  const describedBy =
    [showDescription ? descriptionId : null, showHelper ? helperId : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={checkboxId}>
        <input
          {...props}
          ref={inputRef}
          aria-describedby={describedBy}
          aria-invalid={error || undefined}
          className={styles.input}
          id={checkboxId}
          type="checkbox"
        />
        {label}
      </label>
      {showDescription ? (
        <span id={descriptionId} className={styles.description}>
          {description}
        </span>
      ) : null}
      {showHelper ? (
        <span
          id={helperId}
          className={helperIsError ? styles.errorMessage : styles.description}
        >
          {helperText}
        </span>
      ) : null}
    </div>
  )
}
