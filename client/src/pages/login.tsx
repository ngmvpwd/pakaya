import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { login } from "@/lib/api";
import { setAuthState } from "@/lib/auth";
import { GraduationCap } from "lucide-react";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuthState(data.user);
      setLocation("/dashboard");
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.name}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg-light px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="shadow-elegant-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-chart-5 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">School Attendance System</h1>
              <p className="text-muted-foreground mt-2">Digital attendance management portal</p>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your username" 
                          {...field}
                          disabled={loginMutation.isPending}
                          className="h-12 focus-ring"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter your password" 
                          {...field}
                          disabled={loginMutation.isPending}
                          className="h-12 focus-ring"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
            
            <Card className="mt-8 shadow-sm">
              <CardContent className="p-4 bg-muted/50">
                <h3 className="font-medium text-foreground mb-3">Demo Credentials:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 rounded-md bg-background/50">
                    <span className="font-medium">Admin:</span>
                    <span className="text-muted-foreground">admin / admin123</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-md bg-background/50">
                    <span className="font-medium">Data Entry:</span>
                    <span className="text-muted-foreground">dataentry / data123</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
