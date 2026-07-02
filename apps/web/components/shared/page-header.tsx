import { Button } from "@workspace/ui/components/button"

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function AddButton({
  onClick,
  label = "Add",
}: {
  onClick?: () => void
  label?: string
}) {
  return (
    <Button onClick={onClick} size="sm">
      {label}
    </Button>
  )
}
