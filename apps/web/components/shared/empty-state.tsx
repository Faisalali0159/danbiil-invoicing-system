interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/30">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
