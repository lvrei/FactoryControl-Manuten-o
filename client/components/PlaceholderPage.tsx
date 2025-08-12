import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96">
      <div className="text-center">
        <Construction className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">{title}</h2>
        {description && (
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {description}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Esta página está sendo desenvolvida. Continue solicitando funcionalidades para preenchê-la.
        </p>
      </div>
    </div>
  );
}
