import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function FormPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = await params;
  // Mock data representing the form loaded from DB by params.id
  const form = {
    title: "Customer Feedback 2024",
    description: "Please fill out this form to help us improve our services.",
    fields: [
      { id: "f1", type: "text", label: "Full Name", required: true },
      { id: "f2", type: "text", label: "Feedback", required: true },
    ]
  };

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4 selection:bg-primary selection:text-primary-foreground">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-t-8 border-t-primary shadow-lg border-x-border border-b-border rounded-xl">
          <CardHeader className="pt-8 pb-4 px-8">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">{form.title}</h1>
            <p className="text-lg text-muted-foreground mt-3">{form.description}</p>
          </CardHeader>
          <div className="px-8 pb-4">
             <div className="h-px bg-border/50 w-full" />
             <div className="text-sm text-destructive font-medium mt-4">
               * Indicates required question
             </div>
          </div>
        </Card>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {form.fields.map((field) => (
            <Card key={field.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 md:p-8 space-y-4">
                <Label htmlFor={field.id} className="text-base font-semibold">
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </Label>
                {field.type === "text" && (
                  <Input 
                    id={field.id} 
                    placeholder="Your answer" 
                    className="h-12 border-0 border-b rounded-none shadow-none focus-visible:ring-0 focus-visible:border-primary px-0 text-base"
                    required={field.required}
                  />
                )}
              </CardContent>
            </Card>
          ))}
          
          <div className="flex items-center justify-between pt-4">
             <Button size="lg" type="submit" className="px-8 text-base">Submit</Button>
             <div className="text-xs text-muted-foreground flex items-center gap-1">
               Powered by <span className="font-semibold text-foreground">GoForm</span>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}
