"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientFormData } from "@/lib/validations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { Client } from "@/types/database";

interface ClientFormProps {
  client?: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ClientForm = ({ client, open, onOpenChange, onSuccess }: ClientFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          name: client.name,
          email: client.email || "",
          phone: client.phone || "",
          address: client.address || "",
          tax_id: client.tax_id || "",
          notes: client.notes || "",
        }
      : undefined,
  });

  const handleFormSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/clients/${client.id}` : "/api/clients";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa uložiť klienta",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Úspech",
        description: isEditing ? "Klient bol aktualizovaný" : "Klient bol vytvorený",
      });

      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nastala neočakávaná chyba",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Upraviť klienta" : "Pridať klienta"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Upravte údaje o klientovi"
              : "Vyplňte údaje nového klienta"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Názov *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefón</Label>
            <Input id="phone" {...register("phone")} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_id">IČO/DIČ</Label>
            <Input id="tax_id" {...register("tax_id")} />
            {errors.tax_id && (
              <p className="text-sm text-destructive">{errors.tax_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresa</Label>
            <Input id="address" {...register("address")} />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Zrušiť
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Ukladám..." : isEditing ? "Uložiť" : "Vytvoriť"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

