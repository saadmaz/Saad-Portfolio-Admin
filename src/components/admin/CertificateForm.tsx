import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Save,
  Award,
  Calendar,
  Link as LinkIcon,
  FileBadge,
  Sparkles
} from 'lucide-react';
import { CommonService } from '@/shared/services/common-service';
import { Certificate } from '@/types';
import { toast } from "sonner";
import ImageUpload from './ImageUpload';
import FormHeader from './FormHeader';
import Field from './Field';

const certSchema = z.object({
  title: z.string().min(5, 'Title is too short'),
  issuer: z.string().min(2, 'Issuer is required'),
  platform: z.string().min(2, 'Platform is required'),
  issuer_logo: z.string().url('Invalid URL').optional().or(z.literal('')),
  issue_date: z.string().min(4, 'Issue date is required'),
  credential_url: z.string().url('Invalid URL'),
  description: z.string().min(10, 'Description is too short'),
  category: z.string().default('Development'),
  type: z.string().default('Professional Certificate'),
  is_featured: z.boolean().default(false),
  pdf_document_link: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type CertFormValues = z.infer<typeof certSchema>;

const CertificateForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!id && id !== 'new';

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CertFormValues>({
    resolver: zodResolver(certSchema),
    defaultValues: {
      category: 'Development',
      type: 'Professional Certificate',
      is_featured: false
    }
  });

  const loadCertificate = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await CommonService.getCertificates();
      const item = data.find(c => c.id.toString() === id);
      if (item) {
        reset({
          title: item.title,
          issuer: item.issuer,
          platform: item.platform,
          issuer_logo: item.issuer_logo,
          issue_date: item.issue_date,
          credential_url: item.credential_url,
          description: item.description,
          category: item.category,
          type: item.type,
          is_featured: item.is_featured,
          pdf_document_link: item.pdf_document_link,
        });
      }
    } catch (error) {
      toast.error('Failed to load certificate');
    } finally {
      setIsLoading(false);
    }
  }, [id, reset]);

  useEffect(() => {
    if (isEditMode) {
      loadCertificate();
    }
  }, [isEditMode, loadCertificate]);

  const onSubmit = async (data: CertFormValues) => {
    try {
      setIsLoading(true);
      if (isEditMode) {
        await CommonService.updateCertificate(id!, data);
        toast.success('Certificate updated');
      } else {
        await CommonService.createCertificate(data);
        toast.success('Certificate added');
      }
      navigate('/certificates');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <FormHeader
        backTo="/certificates"
        title={isEditMode ? 'Edit Certificate' : 'Add Achievement'}
        subtitle='"Your hard work is your unique signature."'
        actions={
          <Button
            type="submit"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8"
            disabled={isLoading}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Achievement
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-4 h-4 text-accent" />
                    Credential Essentials
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Field label="Certificate Title" error={errors.title?.message}>
                {(bind) => (
                  <Input {...register('title')} {...bind} placeholder="e.g. Google Cloud Professional Engineer" className="bg-white/5 border-white/10" />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Issuer / Authority" error={errors.issuer?.message}>
                  {(bind) => (
                    <Input {...register('issuer')} {...bind} placeholder="e.g. Google" className="bg-white/5 border-white/10" />
                  )}
                </Field>
                <Field label="Platform">
                  {(bind) => (
                    <Input {...register('platform')} {...bind} placeholder="e.g. Coursera" className="bg-white/5 border-white/10" />
                  )}
                </Field>
              </div>

                <ImageUpload
                  value={watch('issuer_logo')}
                  onChange={(url) => setValue('issuer_logo', url)}
                  label="Issuer Logo (Optional)"
                  className="mb-4"
                />
                <Field label="Brief Description">
                  {(bind) => (
                    <Textarea {...register('description')} {...bind} className="bg-white/5 border-white/10 min-h-[100px]" />
                  )}
                </Field>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5">
                <CardTitle className="text-lg flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-accent" />
                    Validation Links
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Field label="Verifiable Credential URL" error={errors.credential_url?.message}>
                {(bind) => (
                  <Input {...register('credential_url')} {...bind} placeholder="https://..." className="bg-white/5 border-white/10" />
                )}
              </Field>
              <Field label="PDF Document Link (Optional)">
                {(bind) => (
                  <Input {...register('pdf_document_link')} {...bind} placeholder="https://..." className="bg-white/5 border-white/10" />
                )}
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent" />
                    Timing
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Field label="Issue Date">
                {(bind) => (
                  <Input {...register('issue_date')} {...bind} placeholder="e.g. Jan 2024" className="bg-white/5 border-white/10 h-8" />
                )}
              </Field>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileBadge className="w-4 h-4 text-accent" />
                    Classification
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
               <Field label="Category">
                  {(bind) => (
                    <Input {...register('category')} {...bind} className="bg-white/5 border-white/10 h-8 text-sm" />
                  )}
               </Field>
               <Field label="Type">
                  {(bind) => (
                    <Input {...register('type')} {...bind} className="bg-white/5 border-white/10 h-8 text-sm" />
                  )}
               </Field>
               <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-medium">Featured Achievement</span>
                  <input type="checkbox" {...register('is_featured')} className="w-4 h-4 accent-accent" />
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
};

export default CertificateForm;
