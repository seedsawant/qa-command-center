import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function PhaseStub({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>This section ships in Phase {phase}.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
