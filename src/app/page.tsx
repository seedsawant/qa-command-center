import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>QA Command Center</CardTitle>
          <CardDescription>
            Project scaffold is up and running. Next.js, TypeScript, Tailwind
            CSS, and shadcn/ui are wired together.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Button>Get started</Button>
        </div>
      </Card>
    </div>
  );
}
