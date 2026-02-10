import { useState } from "react";
import { MessageSquare, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import ContactDialog, { type ContactType } from "@/components/ContactDialog";

const Contact = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-heading font-bold text-foreground">Mediimate</span>
          </Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">← Back to Home</Link>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12 space-y-3">
            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground">Get in Touch</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Have questions about Mediimate? We'd love to hear from you. Reach out and we'll respond within 24 hours.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="glass-card rounded-xl p-6 space-y-6">
                <h2 className="text-lg font-heading font-bold text-foreground">Contact Information</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">hello@mediimate.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Phone</p>
                      <p className="text-sm text-muted-foreground">+91 98765 43210</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Office</p>
                      <p className="text-sm text-muted-foreground">New Delhi, India</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-heading font-bold text-foreground">Quick Links</h2>
                <div className="space-y-2">
                  <button onClick={() => setDialogOpen(true)} className="block text-sm text-primary hover:underline">Request a Demo →</button>
                  <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
                  <Link to="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
                </div>
              </div>
            </div>

            {/* Inline Contact Form */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-lg font-heading font-bold text-foreground mb-4">Send us a message</h2>
              <InlineContactForm />
            </div>
          </div>
        </div>
      </main>

      <ContactDialog open={dialogOpen} onOpenChange={setDialogOpen} type="demo" />
    </div>
  );
};

// Inline form that posts to the same edge function
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

const InlineContactForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", clinic_name: "", message: "" });

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
        body: { ...form, type: "contact" },
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Message sent!", description: "We'll get back to you shortly." });
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <CheckCircle2 className="w-12 h-12 text-primary" />
        <p className="text-center text-foreground font-medium">Thank you! We'll reach out soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="c-name">Name *</Label>
        <Input id="c-name" name="name" value={form.name} onChange={handleChange} placeholder="Your name" required maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-email">Email *</Label>
        <Input id="c-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required maxLength={255} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-phone">Phone</Label>
        <Input id="c-phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" maxLength={20} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-clinic">Clinic / Organization</Label>
        <Input id="c-clinic" name="clinic_name" value={form.clinic_name} onChange={handleChange} placeholder="Your clinic name" maxLength={150} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-message">Message *</Label>
        <Textarea id="c-message" name="message" value={form.message} onChange={handleChange} placeholder="How can we help?" required maxLength={1000} rows={4} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : "Send Message"}
      </Button>
    </form>
  );
};

export default Contact;
