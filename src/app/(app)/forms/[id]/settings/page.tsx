import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function FormSettingsPage() {
  return (
    <div className="p-4 pt-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Form Settings</h2>
        <p className="text-muted-foreground">
          Configure how your form behaves and who can access it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Options</CardTitle>
          <CardDescription>Basic settings for your form.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formName">Form Name</Label>
            <Input id="formName" defaultValue="Customer Feedback 2024" />
          </div>
          <div className="flex items-center justify-between border rounded-lg p-4 bg-background">
            <div className="space-y-0.5">
              <Label htmlFor="accepting">Accept Responses</Label>
              <p className="text-sm text-muted-foreground">
                Turn off to close the form to new submissions.
              </p>
            </div>
            <Switch id="accepting" defaultChecked />
          </div>
          <div className="flex items-center justify-between border rounded-lg p-4 bg-background">
            <div className="space-y-0.5">
              <Label htmlFor="emails">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive an email for every new submission.
              </p>
            </div>
            <Switch id="emails" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sharing Settings</CardTitle>
          <CardDescription>Control access to this form.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label>Custom URL Slug</Label>
            <div className="flex items-center gap-2">
               <div className="px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm border font-mono">
                 goform.app/f/
               </div>
               <Input defaultValue="customer-feedback-2024" className="font-mono flex-1" />
            </div>
          </div>
          <div className="flex items-center justify-between border rounded-lg p-4 bg-background">
            <div className="space-y-0.5">
              <Label htmlFor="private">Require Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Only logged-in users can view and submit.
              </p>
            </div>
            <Switch id="private" />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-4 pb-12">
        <Button variant="outline">Discard Changes</Button>
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}
