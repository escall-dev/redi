"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Sparkles,
  HelpCircle,
  Shield,
  FileText,
  Heart,
  Smartphone,
  ExternalLink,
} from "lucide-react"

export function AboutSettingsView() {
  const [activeModal, setActiveModal] = React.useState<"faq" | "privacy" | "terms" | null>(null)

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* App Identity Card */}
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>About Seijun</CardTitle>
                <Badge variant="lavender" className="text-[10px] px-2 py-0 font-normal">
                  v2.0.6
                </Badge>
              </div>
              <CardDescription>
                Personal cycle companion & respectful reproductive health tracker
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seijun is designed with calm typography, gentle aesthetics, and uncompromising privacy guarantees. Whether you track your own menstrual phases or walk alongside a partner, Seijun keeps your cycle predictions clear and personal.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border/40 text-xs">
              <Smartphone className="size-4 text-primary shrink-0" />
              <span>Progressive Web App (PWA)</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border/40 text-xs">
              <Heart className="size-4 text-primary shrink-0" />
              <span>Ad-Free & Privacy-First</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources & Support Card */}
      <Card className="overflow-hidden border-border/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-lavender text-primary border border-lavender-border/60">
              <HelpCircle className="size-5" />
            </div>
            <div>
              <CardTitle>Help & Resources</CardTitle>
              <CardDescription>
                Frequently asked questions and policy documentation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <button
            type="button"
            onClick={() => setActiveModal("faq")}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="size-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Frequently Asked Questions</span>
            </div>
            <span className="text-xs text-muted-foreground">View Answers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("privacy")}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Shield className="size-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Privacy Policy</span>
            </div>
            <span className="text-xs text-muted-foreground">Read Policy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("terms")}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText className="size-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Terms of Service</span>
            </div>
            <span className="text-xs text-muted-foreground">Read Terms</span>
          </button>
        </CardContent>
      </Card>

      {/* FAQ Dialog */}
      <Dialog open={activeModal === "faq"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Frequently Asked Questions</DialogTitle>
            <DialogDescription>
              Answers to common questions about tracking and privacy in Seijun.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-sm">
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">How does Seijun calculate my cycle windows?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Seijun uses your baseline typical cycle length and logged period start dates to project your upcoming follicular, fertile, ovulation, and luteal phases. As you log more cycles, projections dynamically refine.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">What is Supporter Mode?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Supporter mode allows partners or loved ones to participate respectfully without requiring personal cycle tracking. When 1:1 Partner Connections launch in Phase 20, you will be able to view shared updates.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Is Seijun medical advice?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No. Seijun is an informational tracking tool and personal journal. It is not intended as contraceptive advice or clinical diagnosis.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={activeModal === "privacy"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>
              Our commitment to protecting your reproductive health data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong>1. Data Ownership:</strong> All cycle logs, symptoms, and private journal notes belong exclusively to you. We do not sell or monetize personal health data.
            </p>
            <p>
              <strong>2. Access Control:</strong> Data stored in our database is protected by Row-Level Security (RLS) policies enforcing that only authenticated sessions with your user ID can read or update your records.
            </p>
            <p>
              <strong>3. Push Notifications:</strong> Web Push subscription endpoints are stored securely and used solely to deliver user-enabled cycle reminders and partner alerts.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog open={activeModal === "terms"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
            <DialogDescription>
              Terms governing the use of Seijun.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong>1. Acceptance:</strong> By accessing Seijun, you agree to these terms and affirm that you are using the application for personal tracking and wellbeing.
            </p>
            <p>
              <strong>2. Not Medical Advice:</strong> Predictions and estimates provided by Seijun are based on mathematical cycle models and must not be used as clinical diagnostic tools or birth control methods.
            </p>
            <p>
              <strong>3. Account Responsibility:</strong> You are responsible for safeguarding your login credentials and ensuring unauthorized parties do not access your device.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
