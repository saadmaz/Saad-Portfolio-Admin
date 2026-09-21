import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from 'lucide-react';
import ImageUpload from './ImageUpload';
import LogoUpload from './LogoUpload';

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'date' | 'image' | 'logo';
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
}

type EntityFormValues = Record<string, unknown>;

interface AdminEntityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: readonly FieldConfig[];
  schema: z.ZodType<EntityFormValues>;
  defaultValues?: EntityFormValues;
  onSubmit: (data: EntityFormValues) => Promise<void>;
  isLoading?: boolean;
  onDelete?: () => void;
}

const AdminEntityDialog = ({
  isOpen,
  onClose,
  title,
  fields,
  schema,
  defaultValues,
  onSubmit,
  isLoading,
  onDelete,
}: AdminEntityDialogProps) => {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<EntityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {},
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues || {});
    }
  }, [isOpen, defaultValues, form]);

  const handleSubmit = async (data: EntityFormValues) => {
    setIsSaving(true);
    try {
      await onSubmit(data);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            {fields.map((field) => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground font-medium">{field.label}</FormLabel>
                    <FormControl>
                      {field.type === 'textarea' ? (
                        <Textarea
                          {...formField}
                          placeholder={field.placeholder}
                          className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent/50 min-h-[100px]"
                        />
                      ) : field.type === 'select' ? (
                        <Select
                          onValueChange={formField.onChange}
                          value={(formField.value as string) ?? ''}
                        >
                          <SelectTrigger className="bg-secondary border-border text-foreground focus:border-accent/50">
                            <SelectValue placeholder={field.placeholder} />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground">
                            {field.options?.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'image' ? (
                        <ImageUpload
                          value={formField.value as string}
                          onChange={formField.onChange}
                        />
                      ) : field.type === 'logo' ? (
                        <LogoUpload
                          value={formField.value as string}
                          onChange={formField.onChange}
                          required={field.required}
                        />
                      ) : (
                        <Input
                          {...formField}
                          type={field.type}
                          placeholder={field.placeholder}
                          className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent/50"
                          onChange={(e) => {
                            if (field.type === 'number') {
                              const raw = e.target.value;
                              formField.onChange(raw === '' ? undefined : Number(raw));
                            } else {
                              formField.onChange(e.target.value);
                            }
                          }}
                        />
                      )}
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            ))}
            <DialogFooter className="pt-4 flex-col gap-2 sm:flex-col">
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onDelete}
                  className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-500 border border-red-500/20 justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Entry
                </Button>
              )}
              <div className="flex gap-2 justify-end w-full">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="hover:bg-secondary text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-accent hover:bg-accent/90 text-black font-bold px-8"
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminEntityDialog;
