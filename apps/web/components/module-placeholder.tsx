import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

interface ModulePlaceholderProps {
  title: string
  description: string
  features: string[]
}

export function ModulePlaceholder({
  title,
  description,
  features,
}: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature} size="sm">
            <CardHeader>
              <CardTitle className="text-sm">{feature}</CardTitle>
              <CardDescription>Coming in next development phase</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
