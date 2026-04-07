import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Monitor, Smartphone, ShieldCheck, LogOut, Link2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <div className="w-full max-w-4xl">
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">Danger</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Make changes to your account here. Click save when you&apos;re done.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative group/avatar">
                    <Avatar className="h-24 w-24 border-2 border-border transition-all duration-300 group-hover/avatar:border-primary">
                      <AvatarImage src="" alt="User profile" />
                      <AvatarFallback className="bg-muted text-2xl font-semibold">JD</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-medium leading-none">Profile Picture</h3>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG or GIF. Max size 2MB.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="h-8">
                        Upload image
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" defaultValue="John Doe" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="john@example.com" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Change your password here. After saving, you&apos;ll be logged out.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="current">Current password</Label>
                  <Input id="current" type="password" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new">New password</Label>
                  <Input id="new" type="password" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save password</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Login Sessions</CardTitle>
                  <CardDescription>
                    Manage your active sessions across different devices and browsers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/40">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Monitor className="size-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            Chrome on Windows 
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase">
                              Active Now
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">San Francisco, CA • 192.168.1.1</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="bg-muted p-2 rounded-full">
                          <Smartphone className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">Safari on iPhone 15</div>
                          <div className="text-sm text-muted-foreground">Los Angeles, CA • 2 days ago</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 gap-2 hover:bg-destructive/10 hover:text-destructive">
                        <LogOut className="size-3.5" />
                        Log out
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="bg-muted p-2 rounded-full">
                          <Monitor className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">Firefox on MacOS</div>
                          <div className="text-sm text-muted-foreground">New York, NY • 1 week ago</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 gap-2 hover:bg-destructive/10 hover:text-destructive">
                        <LogOut className="size-3.5" />
                        Log out
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 px-6 py-4">
                  <Button variant="outline" size="sm" className="ml-auto">
                    Sign out of all other sessions
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Linked Accounts</CardTitle>
                  <CardDescription>
                    Connect your account to social providers for easier sign-in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="bg-muted p-2 rounded-full">
                          <svg className="h-5 w-5" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium">Google</div>
                          <div className="text-sm text-muted-foreground">Connected as john@example.com</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-8">
                        Disconnect
                      </Button>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="danger">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Account</CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </CardContent>
              <CardFooter className="border-t bg-destructive/5 px-6 py-4">
                <Button variant="destructive">Delete Account</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
