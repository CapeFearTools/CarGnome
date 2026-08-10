import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateLead } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { LeadInputLeadType } from '@workspace/api-client-react';

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number is required"),
  message: z.string().optional(),
});

interface InquiryFormProps {
  vin: string;
  listingId: string;
  defaultMessage?: string;
  leadType?: LeadInputLeadType;
  onSuccess?: () => void;
}

export function InquiryForm({ vin, listingId, defaultMessage, leadType = 'inquiry', onSuccess }: InquiryFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const createLead = useCreateLead();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: defaultMessage || "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createLead.mutate(
      {
        data: {
          ...values,
          vin,
          listing_id: listingId,
          lead_type: leadType,
        }
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          if (onSuccess) onSuccess();
        }
      }
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 bg-muted/20 rounded-xl border border-border/50">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
          <CheckCircle2 size={24} />
        </div>
        <h3 className="text-xl font-serif font-bold text-foreground">Message Sent</h3>
        <p className="text-muted-foreground text-sm max-w-[250px]">
          Thank you for your interest. A member of our sales team will contact you shortly.
        </p>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={() => {
            form.reset();
            setSubmitted(false);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="(555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="I'm interested in this vehicle..." 
                  className="resize-none min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          className="w-full text-base py-6 font-semibold shadow-md hover-elevate transition-all duration-300"
          disabled={createLead.isPending}
        >
          {createLead.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Request Information
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
