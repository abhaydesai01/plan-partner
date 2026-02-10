import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

export type ContactType = "free_trial" | "demo" | "contact" | "pricing";

const titleMap: Record<ContactType, string> = {
  free_trial: "Start Your Free Trial",
  demo: "Book a Demo",
  contact: "Contact Us",
  pricing: "Get in Touch",
};

const descMap: Record<ContactType, string> = {
  free_trial: "Fill in your details and we'll set up your free trial within 24 hours.",
  demo: "Schedule a personalized demo with our team to see Mediimate in action.",
  contact: "Have questions? We'd love to hear from you. Send us a message.",
  pricing: "Tell us about your clinic and we'll find the right plan for you.",
};

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ContactType;
}

const ContactDialog = ({ open, onOpenChange, type }: ContactDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    clinic_name: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: { ...form, type },
      });

      if (error) throw error;

      setSubmitted(true);
      toast({ title: "Message sent!", description: "We'll get back to you shortly." });
    } catch (err: any) {
      console.error("Contact form error:", err);
      toast({
        title: "Something went wrong",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setSubmitted(false);
      setForm({ name: "", email: "", phone: "", clinic_name: "", message: "" });
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{titleMap[type]}</DialogTitle>
          <DialogDescription>{descMap[type]}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <p className="text-center text-foreground font-medium">
              Thank you! We'll reach out to you soon.
            </p>
            <Button onClick={() => handleClose(false)} variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Dr. John Doe" required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@clinic.com" required maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic_name">Clinic / Organization</Label>
              <Input id="clinic_name" name="clinic_name" value={form.clinic_name} onChange={handleChange} placeholder="Your clinic name" maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" value={form.message} onChange={handleChange} placeholder="Tell us about your needs..." maxLength={1000} rows={3} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : "Send Message"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContactDialog;
