"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass/glass-card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount, deleteAllApplications } from "@/app/actions/user";

export function DangerZone() {
  const [confirmText, setConfirmText] = useState("");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function clearAll() {
    start(async () => {
      const res = await deleteAllApplications();
      toast.success(`Deleted ${res.count} application${res.count === 1 ? "" : "s"}`);
    });
  }

  return (
    <GlassCard className="border-red-500/20 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
          <AlertTriangle className="size-4 text-red-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Danger zone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These actions are permanent. There is no undo.
          </p>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">Delete all applications</p>
          <p className="text-sm text-muted-foreground">Keep your account, drop the data.</p>
        </div>
        <Button variant="outline" onClick={clearAll} disabled={pending}>
          <Trash2 className="size-4" /> Delete data
        </Button>
      </div>

      <Separator className="my-5" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">Delete account</p>
          <p className="text-sm text-muted-foreground">Wipes your profile, applications, and tags. Everything.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="size-4" /> Delete account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently removes everything. Type <strong>DELETE</strong> below to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm">Type DELETE to confirm</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE" || pending}
                onClick={() => {
                  start(async () => {
                    const res = await deleteAccount();
                    if (res && !res.ok) {
                      toast.error(res.error);
                    }
                  });
                }}
              >
                {pending ? "Deleting…" : "Delete forever"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </GlassCard>
  );
}
