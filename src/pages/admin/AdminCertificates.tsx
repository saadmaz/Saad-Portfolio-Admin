import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  Edit2,
  Trash2,
  Award,
  ExternalLink,
  Calendar,
  DatabaseZap,
  Loader2,
  Save,
} from 'lucide-react';
import { CommonService } from '@/shared/services/common-service';
import { Certificate } from '@/types';
import { toast } from "sonner";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import LogoUpload from '@/components/admin/LogoUpload';

type SeedCert = Omit<Certificate, 'id'>;
const SEED_DATA: SeedCert[] = [
  { title: "Python Essential Training", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-04-19", expiry_date: null, does_not_expire: true, credential_id: "c6ffcc51328b8100caefbdafafb459d8b55b37261071840aa9bc6d20cec5aa82", credential_url: "https://www.linkedin.com/learning/python-essential-training-18764650/", description: "This certification validates a foundational understanding of Python programming, covering core syntax, data structures, and object-oriented programming principles, while establishing best practices for writing clean, efficient, and maintainable code.", skills: ["Python (Programming Language)", "Object-Oriented Programming (OOP)", "Data Structures", "Functional Programming", "Error Handling"], category: "Software Development", type: "certification", tags: ["Python", "Programming", "Backend", "Scripting"], pdf_document_link: "/Certificates/1 - CertificateOfCompletion_Python Essential Training.pdf", is_verifiable: true, is_featured: true },
  { title: "Sales Strategy: Building Relationships to Successfully Sell", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-04-19", expiry_date: null, does_not_expire: true, credential_id: "35fb5efc1577983ed027692501a402052f3fbe28215c3aa8bb6cb655e09b232a", credential_url: "https://www.linkedin.com/learning/certificates/35fb5efc1577983ed027692501a402052f3fbe28215c3aa8bb6cb655e09b232a?trk=share_certificate", description: "Successfully completed the course 'Sales Strategy: Building Relationships to Successfully Sell' by Ronnell Richards, focusing on advanced relationship-building techniques and strategic sales positioning.", skills: ["Relationship Building", "Sales Strategy", "Business Development", "Client Relations"], category: "Business & Strategy", type: "course", tags: ["Sales", "Business", "Networking", "Soft Skills"], pdf_document_link: "/Certificates/2 - CertificateOfCompletion_Sales Strategy Building Relationships to Successfully Sell.pdf", is_verifiable: true, is_featured: true },
  { title: "Everyday AI Concepts", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-22", expiry_date: null, does_not_expire: true, credential_id: "8246341535ebc7a6bf3391a363e4fa0d71fe2ee0c52d0456d3a2e120c0efd839", credential_url: "https://www.linkedin.com/learning/certificates/8246341535ebc7a6bf3391a363e4fa0d71fe2ee0c52d0456d3a2e120c0efd839?trk=share_certificate", description: "Successfully completed 'Everyday AI Concepts' by Doug Rose. This course explores the fundamental principles of artificial intelligence, including machine learning, neural networks, and how AI can be practically applied to solve business challenges.", skills: ["AI for Business", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["AI", "Machine Learning", "Technology", "Innovation"], pdf_document_link: "/Certificates/3 - CertificateOfCompletion_Everyday AI Concepts.pdf", is_verifiable: true, is_featured: true },
  { title: "Copilot in Teams: AI-Powered Collaboration", issuer: "Microsoft via LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Microsoft Teams.svg", issue_date: "2025-10-22", expiry_date: null, does_not_expire: true, credential_id: "a91389d1c43c3ecfbff380b5d2b04a16c4854f264d78e657bcd36cf24be61536", credential_url: "https://www.linkedin.com/learning/certificates/a91389d1c43c3ecfbff380b5d2b04a16c4854f264d78e657bcd36cf24be61536", description: "Successfully completed 'Copilot in Teams: AI-Powered Collaboration' by Nicholas Brazzi.", skills: ["Microsoft Teams", "AI for Business", "Microsoft Copilot"], category: "AI/ML", type: "course", tags: ["Microsoft 365", "AI Productivity", "Collaboration Tools", "Teams"], pdf_document_link: "/Certificates/4 - CertificateOfCompletion_Copilot in Teams AIPowered Collaboration.pdf", is_verifiable: true, is_featured: false },
  { title: "What Is Microsoft Copilot? An Overview of Microsoft's AI Tools (2024)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Microsoft_logo.svg", issue_date: "2025-10-22", expiry_date: null, does_not_expire: true, credential_id: "bd4d926cd73768c25f4234051dbc770f211b414f2fc23b07275b560509232d0c", credential_url: "https://www.linkedin.com/learning/certificates/bd4d926cd73768c25f4234051dbc770f211b414f2fc23b07275b560509232d0c", description: "Successfully completed 'What Is Microsoft Copilot? An Overview of Microsoft's AI Tools (2024)' by Nicholas Brazzi.", skills: ["AI for Business", "Microsoft Copilot", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Microsoft 365", "AI Productivity", "Generative AI", "Microsoft Copilot"], pdf_document_link: "/Certificates/5 - CertificateOfCompletion_What Is Microsoft Copilot An Overview of Microsofts AI Tools 2024.pdf", is_verifiable: true, is_featured: false },
  { title: "Generative AI and Workplace Transformation", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-22", expiry_date: null, does_not_expire: true, credential_id: "4e674f220aca068518be29b9958869835d2720fd5a2d74778288f7d34b3f8f0b", credential_url: "https://www.linkedin.com/learning/certificates/4e674f220aca068518be29b9958869835d2720fd5a2d74778288f7d34b3f8f0b", description: "Successfully completed 'Generative AI and Workplace Transformation' by Charlene Li.", skills: ["Business Transformation", "AI for Business", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Generative AI", "Workplace Transformation", "Change Management", "AI Strategy"], pdf_document_link: "/Certificates/6 - CertificateOfCompletion_Generative AI and Workplace Transformation.pdf", is_verifiable: true, is_featured: false },
  { title: "AI-Driven Project Management: Techniques and Insights with Ricardo Vargas", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-22", expiry_date: null, does_not_expire: true, credential_id: "f7479f0148f9f9f9ad5364f2a9723a778ae6aaf9663058098c8b11cf11199a3f", credential_url: "https://www.linkedin.com/learning/certificates/f7479f0148f9f9f9ad5364f2a9723a778ae6aaf9663058098c8b11cf11199a3f", description: "Successfully completed 'AI-Driven Project Management: Techniques and Insights with Ricardo Vargas' by Ricardo Vargas.", skills: ["AI for Business", "Project Management", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Project Management", "AI", "Workflow Optimization", "Strategy"], pdf_document_link: "/Certificates/7 - CertificateOfCompletion_AIDriven Project Management Techniques and Insights with Ricardo Vargas.pdf", is_verifiable: true, is_featured: false },
  { title: "Introduction to Artificial Intelligence", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-22", expiry_date: null, does_not_expire: true, credential_id: "abde534a9c45a33979dcbc3c7ba568f3387008c7b3ee4605748ab6d95ebaf4ab", credential_url: "https://www.linkedin.com/learning/certificates/abde534a9c45a33979dcbc3c7ba568f3387008c7b3ee4605748ab6d95ebaf4ab", description: "Successfully completed 'Introduction to Artificial Intelligence' by Doug Rose.", skills: ["AI Literacy", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["AI", "Innovation", "Technology", "Future of Work"], pdf_document_link: "/Certificates/8 - CertificateOfCompletion_Introduction to Artificial Intelligence.pdf", is_verifiable: true, is_featured: true },
  { title: "Microsoft Security Essentials: Concepts, Solutions, and AI-Powered Protection", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Microsoft_logo.svg", issue_date: "2025-10-23", expiry_date: null, does_not_expire: true, credential_id: "fc6801413c58ca7c1a696a78991852a6b3142343d8c0e8091e1658775eb5ca2a", credential_url: "https://www.linkedin.com/learning/certificates/fc6801413c58ca7c1a696a78991852a6b3142343d8c0e8091e1658775eb5ca2a", description: "Successfully completed 'Microsoft Security Essentials: Concepts, Solutions, and AI-Powered Protection' by Bryan Li.", skills: ["Microsoft Security", "Governance, Risk Management, and Compliance (GRC)", "Cloud Security"], category: "Cloud & DevOps", type: "course", tags: ["Cybersecurity", "Microsoft Security", "GRC", "AI Security"], pdf_document_link: "/Certificates/9 - CertificateOfCompletion_Microsoft Security Essentials Concepts Solutions and AIPowered Protection.pdf", is_verifiable: true, is_featured: false },
  { title: "Microsoft Security Essentials Professional Certificate by Microsoft and LinkedIn", issuer: "Microsoft and LinkedIn", platform: "LinkedIn Learning", issuer_logo: "/Logo/Microsoft_logo.svg", issue_date: "2025-10-23", expiry_date: null, does_not_expire: true, credential_id: "1d1bda956bd73a351096e4062be363cf6efe564afb00133ceee1678ad551e803", credential_url: "https://www.linkedin.com/learning/certificates/1d1bda956bd73a351096e4062be363cf6efe564afb00133ceee1678ad551e803", description: "Successfully completed the comprehensive Microsoft Security Essentials Professional Certificate learning path.", skills: ["Microsoft Security", "Governance, Risk Management, and Compliance (GRC)", "Cloud Security"], category: "Cloud & DevOps", type: "professional certificate", tags: ["Cybersecurity", "Microsoft Security", "Cloud Protection", "Professional Certificate"], pdf_document_link: "/Certificates/10 - CertificateOfCompletion_Microsoft Security Essentials Professional Certificate by Microsoft and LinkedIn.pdf", is_verifiable: true, is_featured: true },
  { title: "Generative AI vs. Traditional AI", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-23", expiry_date: null, does_not_expire: true, credential_id: "3b7be946d144b7272ebcc15dc3448ed57ddbe12588eabf6952588f6bab078e50", credential_url: "https://www.linkedin.com/learning/certificates/3b7be946d144b7272ebcc15dc3448ed57ddbe12588eabf6952588f6bab078e50", description: "Successfully completed 'Generative AI vs. Traditional AI' by Doug Rose.", skills: ["Traditional AI", "Artificial Intelligence (AI)", "Generative AI"], category: "AI/ML", type: "course", tags: ["Generative AI", "AI Architecture", "Machine Learning", "Technology Comparison"], pdf_document_link: "/Certificates/11 - CertificateOfCompletion_Generative AI vs. Traditional AI.pdf", is_verifiable: true, is_featured: false },
  { title: "Agile Practices Using AI", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-23", expiry_date: null, does_not_expire: true, credential_id: "5aa40128cc74dc6f50227410ff8cf20c68f5b956a23d73336c32a74cd2ba250e", credential_url: "https://www.linkedin.com/learning/certificates/5aa40128cc74dc6f50227410ff8cf20c68f5b956a23d73336c32a74cd2ba250e", description: "Successfully completed 'Agile Practices Using AI' by Noah Gift.", skills: ["Agile Methodologies", "AI for Business", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Agile", "AI Integration", "Software Development", "Project Management"], pdf_document_link: "/Certificates/12 - CertificateOfCompletion_Agile Practices Using AI.pdf", is_verifiable: true, is_featured: false },
  { title: "How to Boost Your Productivity with AI Tools", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-23", expiry_date: null, does_not_expire: true, credential_id: "097552e0a44e59476df4e3b8091ccb0237784e31220409abe530aae92f9e51a0", credential_url: "https://www.linkedin.com/learning/certificates/097552e0a44e59476df4e3b8091ccb0237784e31220409abe530aae92f9e51a0", description: "Successfully completed 'How to Boost Your Productivity with AI Tools' by Dave Birss.", skills: ["AI Productivity", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["AI Tools", "Productivity", "Workflow Automation", "Efficiency"], pdf_document_link: "/Certificates/13 - CertificateOfCompletion_How to Boost Your Productivity with AI Tools.pdf", is_verifiable: true, is_featured: false },
  { title: "IT and Cybersecurity Risk Management Essential Training", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-24", expiry_date: null, does_not_expire: true, credential_id: "2f17ee0562dd919a93b47dbe263dead43cf0c18def759f44deaffec9eb6227d6", credential_url: "https://www.linkedin.com/learning/certificates/2f17ee0562dd919a93b47dbe263dead43cf0c18def759f44deaffec9eb6227d6", description: "Successfully completed 'IT and Cybersecurity Risk Management Essential Training' by Kip Boyle.", skills: ["IT Risk Management", "Governance, Risk Management, and Compliance (GRC)"], category: "Cloud & DevOps", type: "course", tags: ["Cybersecurity", "Risk Management", "GRC", "IT Governance"], pdf_document_link: "/Certificates/14 - CertificateOfCompletion_IT and Cybersecurity Risk Management Essential Training.pdf", is_verifiable: true, is_featured: false },
  { title: "Practical Tips for Demonstrating Accountability as a Leader", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-25", expiry_date: null, does_not_expire: true, credential_id: "a0d008e518af4f6213ffabcfac027ab816c8b97ff38b441fde37847e8173b318", credential_url: "https://www.linkedin.com/learning/certificates/a0d008e518af4f6213ffabcfac027ab816c8b97ff38b441fde37847e8173b318", description: "Successfully completed 'Practical Tips for Demonstrating Accountability as a Leader' by Dr. Shirley Davis.", skills: ["Leadership Accountability"], category: "Business & Strategy", type: "course", tags: ["Leadership", "Management", "Accountability", "Professional Development"], pdf_document_link: "/Certificates/15 - CertificateOfCompletion_Practical Tips for Demonstrating Accountability as a Leader.pdf", is_verifiable: true, is_featured: false },
  { title: "Networking in the Age of AI", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-25", expiry_date: null, does_not_expire: true, credential_id: "c1cdee079b15f1c3131cb58d32ab2c30a19485b7f468c88f9beeb8d704108b3f", credential_url: "https://www.linkedin.com/learning/certificates/c1cdee079b15f1c3131cb58d32ab2c30a19485b7f468c88f9beeb8d704108b3f", description: "Successfully completed 'Networking in the Age of AI' by Ruth Gotian.", skills: ["AI for Career Development", "Business Networking", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Networking", "Career Development", "AI Strategy", "Professional Growth"], pdf_document_link: "/Certificates/16 - CertificateOfCompletion_Networking in the Age of AI.pdf", is_verifiable: true, is_featured: false },
  { title: "Overcome Communication Challenges: Adapt Your Style for Success", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-25", expiry_date: null, does_not_expire: true, credential_id: "3b79054e9e43e7a7cd12c803710a369bc4e5b2e223455afbc353aa03e1423c4d", credential_url: "https://www.linkedin.com/learning/certificates/3b79054e9e43e7a7cd12c803710a369bc4e5b2e223455afbc353aa03e1423c4d", description: "Successfully completed 'Overcome Communication Challenges: Adapt Your Style for Success' by Melody Wilding.", skills: ["Conflict Management", "Interpersonal Communication"], category: "Business & Strategy", type: "course", tags: ["Communication", "Soft Skills", "Leadership", "Professional Success"], pdf_document_link: "/Certificates/17 - CertificateOfCompletion_Overcome Communication Challenges Adapt Your Style for Success.pdf", is_verifiable: true, is_featured: false },
  { title: "Leadership Transitions: Becoming a Leader of Leaders", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-25", expiry_date: null, does_not_expire: true, credential_id: "2a98f0c63a04f938caed71af6a8af81d135a380bf80cf67f6f9f57cf5eb4569d", credential_url: "https://www.linkedin.com/learning/certificates/2a98f0c63a04f938caed71af6a8af81d135a380bf80cf67f6f9f57cf5eb4569d", description: "Successfully completed 'Leadership Transitions: Becoming a Leader of Leaders' by Melody Wilding.", skills: ["Strategic Leadership", "Managing Managers"], category: "Business & Strategy", type: "course", tags: ["Leadership", "Management", "Career Transition", "Strategy"], pdf_document_link: "/Certificates/18 - CertificateOfCompletion_Leadership Transitions.pdf", is_verifiable: true, is_featured: false },
  { title: "Advanced SQL Project: Design and Manage a Database", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-25", expiry_date: null, does_not_expire: true, credential_id: "7232ccf428d4903fb29b0332893348cae4654c28fe0ceaa62bc8bb684764cf8f", credential_url: "https://www.linkedin.com/learning/certificates/7232ccf428d4903fb29b0332893348cae4654c28fe0ceaa62bc8bb684764cf8f", description: "Successfully completed 'Advanced SQL Project: Design and Manage a Database' by Walter Shields.", skills: ["Database Design", "Extract, Transform, Load (ETL)", "SQL"], category: "Technology & Web Development", type: "course", tags: ["SQL", "Databases", "ETL", "Data Management"], pdf_document_link: "/Certificates/19 - CertificateOfCompletion_Advanced SQL Project.pdf", is_verifiable: true, is_featured: false },
  { title: "What No One Tells You About Career Fulfillment with Arthur Brooks", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-25", expiry_date: null, does_not_expire: true, credential_id: "fcec0c8a114d10657f3039d00ff61c7e3a168a14b1c7d0eb902e2b3f175d3204", credential_url: "https://www.linkedin.com/learning/certificates/fcec0c8a114d10657f3039d00ff61c7e3a168a14b1c7d0eb902e2b3f175d3204", description: "Successfully completed 'What No One Tells You About Career Fulfillment with Arthur Brooks' by Dr. Arthur Brooks.", skills: ["Relationship Building", "Career Assessment", "Career Management"], category: "Business & Strategy", type: "course", tags: ["Career Fulfillment", "Professional Development", "Arthur Brooks", "Soft Skills"], pdf_document_link: "/Certificates/20 - CertificateOfCompletion_What No One Tells You About Career Fulfillment with Arthur Brooks.pdf", is_verifiable: true, is_featured: false },
  { title: "People Analytics", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-25", expiry_date: null, does_not_expire: true, credential_id: "12c0a6d7cb35861ac62ef7610d42da998da1fb10dd402e390b7196552000a3be", credential_url: "https://www.linkedin.com/learning/certificates/12c0a6d7cb35861ac62ef7610d42da998da1fb10dd402e390b7196552000a3be", description: "Successfully completed 'People Analytics' by Josh Bersin.", skills: ["People Analytics"], category: "Business & Strategy", type: "course", tags: ["HR Analytics", "Data Analysis", "Josh Bersin", "Talent Management"], pdf_document_link: "/Certificates/21 - CertificateOfCompletion_People Analytics.pdf", is_verifiable: true, is_featured: false },
  { title: "Cybersecurity Foundations", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-25", expiry_date: null, does_not_expire: true, credential_id: "07ee1efed86fbf3a39881fb27df9382c107a160a11ce56ae91fda2c91bdd86c7", credential_url: "https://www.linkedin.com/learning/certificates/07ee1efed86fbf3a39881fb27df9382c107a160a11ce56ae91fda2c91bdd86c7", description: "Successfully completed 'Cybersecurity Foundations' by Malcolm Shore.", skills: ["Cybersecurity"], category: "Cloud & DevOps", type: "course", tags: ["Cybersecurity", "Information Security", "Risk Management", "Security Basics"], pdf_document_link: "/Certificates/22 - CertificateOfCompletion_Cybersecurity Foundations.pdf", is_verifiable: true, is_featured: false },
  { title: "Become an AI-Powered People Manager", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-25", expiry_date: null, does_not_expire: true, credential_id: "3577dd4026e2c94a97dac5badc5892570eacddbea8f2dfc1a3b19495471253a9", credential_url: "https://www.linkedin.com/learning/certificates/3577dd4026e2c94a97dac5badc5892570eacddbea8f2dfc1a3b19495471253a9", description: "Successfully completed 'Become an AI-Powered People Manager' by Ashley Herd.", skills: ["Generative AI for Management", "AI for Business", "People Management"], category: "AI/ML", type: "course", tags: ["AI for Leadership", "People Management", "Generative AI", "Management Strategy"], pdf_document_link: "/Certificates/23 - CertificateOfCompletion_Become an AIPowered People Manager.pdf", is_verifiable: true, is_featured: false },
  { title: "How to Research and Write Using Generative AI Tools (2023)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-26", expiry_date: null, does_not_expire: true, credential_id: "164406439882f7168c860f40242bca4d3b9743bf0b25cad9ecc2a3f6317c4090", credential_url: "https://www.linkedin.com/learning/certificates/164406439882f7168c860f40242bca4d3b9743bf0b25cad9ecc2a3f6317c4090", description: "Successfully completed 'How to Research and Write Using Generative AI Tools (2023)' by Dave Birss.", skills: ["AI for Business", "Artificial Intelligence for Design", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Generative AI", "Research Skills", "AI Writing", "Prompt Engineering"], pdf_document_link: "/Certificates/24 - CertificateOfCompletion_How to Research and Write Using Generative AI Tools 2023.pdf", is_verifiable: true, is_featured: false },
  { title: "Learning GitHub (2023)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Github.svg", issue_date: "2025-10-26", expiry_date: null, does_not_expire: true, credential_id: "4f7d96555d2c9fb6f155889a148b507f3767282f2e64eb1f84c6816d3bd45a48", credential_url: "https://www.linkedin.com/learning/certificates/4f7d96555d2c9fb6f155889a148b507f3767282f2e64eb1f84c6816d3bd45a48", description: "Successfully completed 'Learning GitHub (2023)' by Emanuele Bartolesi.", skills: ["GitHub"], category: "Technology & Web Development", type: "course", tags: ["Git", "GitHub", "Version Control", "DevOps"], pdf_document_link: "/Certificates/25 - CertificateOfCompletion_Learning GitHub 2023.pdf", is_verifiable: true, is_featured: false },
  { title: "The CEO Test: Mastering Leadership Challenges (Book Bite)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-26", expiry_date: null, does_not_expire: true, credential_id: "6edeb2c1634f6c549183711f1315079679f93836597cda3fc240b809c867317b", credential_url: "https://www.linkedin.com/learning/certificates/6edeb2c1634f6c549183711f1315079679f93836597cda3fc240b809c867317b", description: "Successfully completed 'The CEO Test: Mastering Leadership Challenges (Book Bite)' by Next Big Idea Club.", skills: ["Leadership"], category: "Business & Strategy", type: "course", tags: ["Leadership", "Management", "CEO Insights", "Professional Development"], pdf_document_link: "/Certificates/26 - CertificateOfCompletion_The CEO Test Mastering Leadership Challenges Book Bite.pdf", is_verifiable: true, is_featured: false },
  { title: "ISACA Certified Information System Manager (CISM) Cert Prep", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/ISACA Logo.png", issue_date: "2025-10-31", expiry_date: null, does_not_expire: true, credential_id: "91fb1dbe8a7759905dbf041e35900fd74318cfe7a03a3679299b4ce52073dbda", credential_url: "https://www.linkedin.com/learning/certificates/91fb1dbe8a7759905dbf041e35900fd74318cfe7a03a3679299b4ce52073dbda", description: "Successfully completed 'ISACA Certified Information System Manager (CISM) Cert Prep' by Cybrary.", skills: ["Network Security", "Information Security Management"], category: "Cloud & DevOps", type: "course", tags: ["Cybersecurity", "CISM", "Information Security", "Security Management"], pdf_document_link: "/Certificates/27 - CertificateOfCompletion_ISACA Certified Information System Manager CISM Cert Prep.pdf", is_verifiable: true, is_featured: true },
  { title: "Introduction to Career Skills in Data Analytics", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-26", expiry_date: null, does_not_expire: true, credential_id: "edd7af5ca4af81109d6c768d3c673a9388c93aa03af81712985757e3258c5932", credential_url: "https://www.linkedin.com/learning/certificates/edd7af5ca4af81109d6c768d3c673a9388c93aa03af81712985757e3258c5932", description: "Successfully completed 'Introduction to Career Skills in Data Analytics' by Robin Hunt.", skills: ["Data Analytics", "Tech Career Skills"], category: "Technology & Web Development", type: "course", tags: ["Data Analytics", "Career Development", "Tech Skills", "Data Science Foundations"], pdf_document_link: "/certificates/intro-career-skills-data-analytics.pdf", is_verifiable: true, is_featured: false },
  { title: "AI Pair Programming with GitHub Copilot", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Github.svg", issue_date: "2025-10-24", expiry_date: null, does_not_expire: true, credential_id: "54e4975777de59bb2b735a17db2f336f6fd691afb38e4b1a939743ef18fe3f05", credential_url: "https://www.linkedin.com/learning/certificates/54e4975777de59bb2b735a17db2f336f6fd691afb38e4b1a939743ef18fe3f05", description: "Successfully completed 'AI Pair Programming with GitHub Copilot' by Ronnie Sheer.", skills: ["GitHub Copilot", "Artificial Intelligence (AI)"], category: "Technology & Web Development", type: "course", tags: ["AI Coding", "GitHub Copilot", "Pair Programming", "DevTools"], pdf_document_link: "/Certificates/29 - CertificateOfCompletion_AI Pair Programming with GitHub Copilot.pdf", is_verifiable: true, is_featured: true },
  { title: "CompTIA Security+ (SY0-701) Cert Prep", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-31", expiry_date: null, does_not_expire: true, credential_id: "679b8d79fd3e84668b50a992f45df7efe2c0a16a6bd082b8750e95a71af0309c", credential_url: "https://www.linkedin.com/learning/certificates/679b8d79fd3e84668b50a992f45df7efe2c0a16a6bd082b8750e95a71af0309c", description: "Successfully completed 'CompTIA Security+ (SY0-701) Cert Prep' by Infosec Institute.", skills: ["Security Monitoring", "Enterprise Security", "Threat & Vulnerability Management"], category: "Cloud & DevOps", type: "course", tags: ["Cybersecurity", "CompTIA", "Security+", "Network Security"], pdf_document_link: "/Certificates/30 - CertificateOfCompletion_CompTIA Security SY0701 Cert Prep.pdf", is_verifiable: true, is_featured: true },
  { title: "Create LinkedIn Posts that Stand Out with Jamé Jackson", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-31", expiry_date: null, does_not_expire: true, credential_id: "fcc09c6d76201f2b93ef322298dad424c0a7cc06ec6c2805b65037a0d6ec0383", credential_url: "https://www.linkedin.com/learning/certificates/fcc09c6d76201f2b93ef322298dad424c0a7cc06ec6c2805b65037a0d6ec0383", description: "Successfully completed 'Create LinkedIn Posts that Stand Out with Jamé Jackson' by LinkedIn News.", skills: ["LinkedIn", "Personal Branding", "Business Networking"], category: "Business & Strategy", type: "course", tags: ["LinkedIn", "Content Creation", "Personal Branding", "Networking"], pdf_document_link: "/Certificates/31 - CertificateOfCompletion_Create LinkedIn Posts that Stand Out with Jamé Jackson.pdf", is_verifiable: true, is_featured: false },
  { title: "Building an Adaptability Mindset in the Age of AI", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-31", expiry_date: null, does_not_expire: true, credential_id: "71d7285689d240b39c39150a3568102311fb22a4e9d19b5cda59cb1de8f7b70b", credential_url: "https://www.linkedin.com/learning/certificates/71d7285689d240b39c39150a3568102311fb22a4e9d19b5cda59cb1de8f7b70b", description: "Successfully completed 'Building an Adaptability Mindset in the Age of AI' by Chris Shipley.", skills: ["Critical Thinking", "AI Productivity", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Adaptability", "Future of Work", "Mindset", "AI Strategy"], pdf_document_link: "/Certificates/32 - CertificateOfCompletion_Building an Adaptability Mindset in the Age of AI.pdf", is_verifiable: true, is_featured: false },
  { title: "Video Without Cameras: Text-to-Video Tools and Trends", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-31", expiry_date: null, does_not_expire: true, credential_id: "94277040657e6568aa4a045c368285f7d6f4ce287ed1ae0a7b3b385dd92c64de", credential_url: "https://www.linkedin.com/learning/certificates/94277040657e6568aa4a045c368285f7d6f4ce287ed1ae0a7b3b385dd92c64de", description: "Successfully completed 'Video Without Cameras: Text-to-Video Tools and Trends' by Ashley Kennedy.", skills: ["Video Generation", "Artificial Intelligence for Design", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["AI Video", "Generative AI", "Video Production", "Design Trends"], pdf_document_link: "/Certificates/33 - CertificateOfCompletion_Video Without Cameras TexttoVideo Tools and Trends.pdf", is_verifiable: true, is_featured: false },
  { title: "What Is Generative AI?", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-30", expiry_date: null, does_not_expire: true, credential_id: "1bd2746bc0d7e03f38282ae33a8622a157514d1736379e31bcd3a7efd7d8ead6", credential_url: "https://www.linkedin.com/learning/certificates/1bd2746bc0d7e03f38282ae33a8622a157514d1736379e31bcd3a7efd7d8ead6", description: "Successfully completed 'What Is Generative AI?' by Pinar Seyhan Demirdag.", skills: ["Generative AI Tools", "Artificial Intelligence (AI)", "Generative AI"], category: "AI/ML", type: "course", tags: ["Generative AI", "AI Foundations", "Machine Learning", "Innovation"], pdf_document_link: "/Certificates/34 - CertificateOfCompletion_What Is Generative AI.pdf", is_verifiable: true, is_featured: false },
  { title: "Leveraging the Power of Social Intelligence in the Age of AI", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-30", expiry_date: null, does_not_expire: true, credential_id: "7e2dbf5a3b6444a9932789d0b5a701db0dd49d828b226a0b50ae533b0a38ce0e", credential_url: "https://www.linkedin.com/learning/certificates/7e2dbf5a3b6444a9932789d0b5a701db0dd49d828b226a0b50ae533b0a38ce0e", description: "Successfully completed 'Leveraging the Power of Social Intelligence in the Age of AI' by Chris Shipley.", skills: ["Social Intelligence", "Interpersonal Skills", "AI Productivity"], category: "AI/ML", type: "course", tags: ["Social Intelligence", "AI Strategy", "Future of Work", "Soft Skills"], pdf_document_link: "/Certificates/35 - CertificateOfCompletion_Leveraging the Power of Social Intelligence in the Age of AI.pdf", is_verifiable: true, is_featured: false },
  { title: "Writing Great Content with Gen AI That Doesn't Sound Fake", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-31", expiry_date: null, does_not_expire: true, credential_id: "3b0b573d0a42ab188cd268c81c8f78179f57ca3d0fbacc5b1a19f77eb8a9beaf", credential_url: "https://www.linkedin.com/learning/certificates/3b0b573d0a42ab188cd268c81c8f78179f57ca3d0fbacc5b1a19f77eb8a9beaf", description: "Successfully completed 'Writing Great Content with Gen AI That Doesn't Sound Fake' by Nels Henderson.", skills: ["AI for Business", "Generative AI Tools", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Content Creation", "AI Writing", "Generative AI", "Authentic Communication"], pdf_document_link: "/Certificates/36 - CertificateOfCompletion_Writing Great Content with Gen AI That Doesnt Sound Fake.pdf", is_verifiable: true, is_featured: false },
  { title: "Elearning Essentials: Instructional Design", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-01", expiry_date: null, does_not_expire: true, credential_id: "e84f09b8f20fcd349350052394205dd7e306b8c652fcbaacfc16d1f9b28978d6", credential_url: "https://www.linkedin.com/learning/certificates/e84f09b8f20fcd349350052394205dd7e306b8c652fcbaacfc16d1f9b28978d6", description: "Successfully completed 'Elearning Essentials: Instructional Design' by Samantha Calamari.", skills: ["Instructional Design", "E-Learning"], category: "Business & Strategy", type: "course", tags: ["Instructional Design", "E-Learning", "Education Technology", "Digital Learning"], pdf_document_link: "/Certificates/37 - CertificateOfCompletion_Elearning Essentials Instructional Design.pdf", is_verifiable: true, is_featured: false },
  { title: "Using Data Effectively and Reliably with AI Analytics", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-01", expiry_date: null, does_not_expire: true, credential_id: "caf830bf6889a4704f4c096075a8969adbfac2aeefcb877ce43bdf34495a0476", credential_url: "https://www.linkedin.com/learning/certificates/caf830bf6889a4704f4c096075a8969adbfac2aeefcb877ce43bdf34495a0476", description: "Successfully completed 'Using Data Effectively and Reliably with AI Analytics' by John H. Johnson.", skills: ["AI for Business Analysis", "Data Analytics", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["AI Analytics", "Data Integrity", "Business Analysis", "Advanced Analytics"], pdf_document_link: "/Certificates/38 - CertificateOfCompletion_Using Data Effectively and Reliably with AI Analytics.pdf", is_verifiable: true, is_featured: false },
  { title: "Microsoft Azure AI Essentials: Workloads and Machine Learning on Azure", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Microsoft Azure.svg", issue_date: "2025-11-01", expiry_date: null, does_not_expire: true, credential_id: "09f63f73cf910177a0f53e7cbf43c5b1d65ea69ee0190138830568b54d894a32", credential_url: "https://www.linkedin.com/learning/certificates/09f63f73cf910177a0f53e7cbf43c5b1d65ea69ee0190138830568b54d894a32", description: "Successfully completed 'Microsoft Azure AI Essentials: Workloads and Machine Learning on Azure' by Ziggy Z.", skills: ["Machine Learning", "Azure AI Foundry", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Microsoft Azure", "Cloud AI", "Machine Learning", "Azure AI Foundry"], pdf_document_link: "/Certificates/39 - CertificateOfCompletion_Microsoft Azure AI Essentials Workloads and Machine Learning on Azure.pdf", is_verifiable: true, is_featured: true },
  { title: "The AI-Driven Project Manager: 10X Your Productivity with Generative AI", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-01", expiry_date: null, does_not_expire: true, credential_id: "97ee2882432f3adb963ac094ad10ec7845b59d727e732791310358e95c9bced0", credential_url: "https://www.linkedin.com/learning/certificates/97ee2882432f3adb963ac094ad10ec7845b59d727e732791310358e95c9bced0", description: "Successfully completed 'The AI-Driven Project Manager: 10X Your Productivity with Generative AI' by Jean Kang.", skills: ["Project Management", "AI for Business", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["AI for Project Management", "Generative AI", "ChatGPT", "Productivity"], pdf_document_link: "/Certificates/40 - CertificateOfCompletion_The AIDriven Project Manager 10X Your Productivity with Generative AI.pdf", is_verifiable: true, is_featured: true },
  { title: "DevOps Foundations: Going Cloud Native", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-02", expiry_date: null, does_not_expire: true, credential_id: "75acd5d634ccc9438bf46da1e29331af117e8ebdbfd7c74a0688e7c6bb23f51e", credential_url: "https://www.linkedin.com/learning/certificates/75acd5d634ccc9438bf46da1e29331af117e8ebdbfd7c74a0688e7c6bb23f51e", description: "Successfully completed 'DevOps Foundations: Going Cloud Native' by Karthik Gaekwad.", skills: ["DevOps Foundations", "Cloud Development", "DevOps"], category: "Cloud & DevOps", type: "course", tags: ["Cloud Native", "DevOps Foundations", "Cloud Architecture", "CI/CD"], pdf_document_link: "/Certificates/41 - CertificateOfCompletion_DevOps Foundations Going Cloud Native.pdf", is_verifiable: true, is_featured: false },
  { title: "Microsoft 365 Endpoint Administrator Associate (MD-102) Cert Prep: 1 Deploy Windows Client", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Microsoft_logo.svg", issue_date: "2025-11-02", expiry_date: null, does_not_expire: true, credential_id: "7fa76bc2428f0c4d9fd30ae0cb81a321b83333b539a93698d83949fa60f98a9a", credential_url: "https://www.linkedin.com/learning/certificates/7fa76bc2428f0c4d9fd30ae0cb81a321b83333b539a93698d83949fa60f98a9a", description: "Successfully completed the MD-102 certification prep course by Microsoft Press.", skills: ["Microsoft 365", "Network Administration"], category: "Technology & Web Development", type: "course", tags: ["Microsoft 365", "Windows Deployment", "Endpoint Administration", "MD-102"], pdf_document_link: "/Certificates/42 - CertificateOfCompletion_Microsoft 365 Endpoint Administrator Associate MD102 Cert Prep 1 Deploy Windows Client.pdf", is_verifiable: true, is_featured: false },
  { title: "Python Practice: Object-Oriented Programming", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-02", expiry_date: null, does_not_expire: true, credential_id: "1dd21e790a4db1cbfc74daae494297f4d38f4f2951acda0f7366457964ca24b3", credential_url: "https://www.linkedin.com/learning/certificates/1dd21e790a4db1cbfc74daae494297f4d38f4f2951acda0f7366457964ca24b3", description: "Successfully completed 'Python Practice: Object-Oriented Programming' by Scott Simpson.", skills: ["Object-Oriented Programming (OOP)", "Python (Programming Language)"], category: "Technology & Web Development", type: "course", tags: ["Python", "OOP", "Coding Challenges", "Software Development"], pdf_document_link: "/Certificates/43 - CertificateOfCompletion_Python Practice ObjectOriented Programming.pdf", is_verifiable: true, is_featured: false },
  { title: "Refactoring with GitHub Copilot", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Github.svg", issue_date: "2025-10-31", expiry_date: null, does_not_expire: true, credential_id: "4ef680317133a91672851d309be58dbb89a02197e4b0d33353763da3951523e0", credential_url: "https://www.linkedin.com/learning/certificates/4ef680317133a91672851d309be58dbb89a02197e4b0d33353763da3951523e0", description: "Successfully completed 'Refactoring with GitHub Copilot' by Gary Kovar.", skills: ["GitHub Copilot", "PHP", "Artificial Intelligence (AI)"], category: "Technology & Web Development", type: "course", tags: ["AI Coding", "GitHub Copilot", "PHP", "Refactoring", "Clean Code"], pdf_document_link: "/Certificates/44 - CertificateOfCompletion_Refactoring with GitHub Copilot.pdf", is_verifiable: true, is_featured: false },
  { title: "Responsible GitHub Copilot: Creating Reliable Code Ethically", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Github.svg", issue_date: "2025-11-02", expiry_date: null, does_not_expire: true, credential_id: "fc517881ae92c4ecc240b22fdc00e84134995ea5b7b087e5145a173f71ddb3f8", credential_url: "https://www.linkedin.com/learning/certificates/fc517881ae92c4ecc240b22fdc00e84134995ea5b7b087e5145a173f71ddb3f8", description: "Successfully completed 'Responsible GitHub Copilot: Creating Reliable Code Ethically' by Rob Bos.", skills: ["GitHub Copilot", "Artificial Intelligence (AI)"], category: "Technology & Web Development", type: "course", tags: ["AI Ethics", "GitHub Copilot", "Responsible AI", "Software Development"], pdf_document_link: "/Certificates/45 - CertificateOfCompletion_Responsible GitHub Copilot Creating Reliable Code Ethically.pdf", is_verifiable: true, is_featured: false },
  { title: "Learning Data Analytics: 1 Foundations", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-02", expiry_date: null, does_not_expire: true, credential_id: "4b5530f4561fa2541a5446a74c6ba095bbb7fb722accae8633c61f788d776461", credential_url: "https://www.linkedin.com/learning/certificates/4b5530f4561fa2541a5446a74c6ba095bbb7fb722accae8633c61f788d776461", description: "Successfully completed 'Learning Data Analytics: 1 Foundations' by Robin Hunt.", skills: ["Data Analytics"], category: "Technology & Web Development", type: "course", tags: ["Data Analytics", "Data Foundations", "Business Intelligence", "Analytics Basics"], pdf_document_link: "/Certificates/46 - CertificateOfCompletion_Learning Data Analytics 1 Foundations.pdf", is_verifiable: true, is_featured: false },
  { title: "Learning Data Analytics Part 2: Extending and Applying Core Knowledge", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-02", expiry_date: null, does_not_expire: true, credential_id: "0bb62c4d70e1e73cfc6ae6d17fe0532d91ce90d2a1d1d4e115c7f42e29aec1f1", credential_url: "https://www.linkedin.com/learning/certificates/0bb62c4d70e1e73cfc6ae6d17fe0532d91ce90d2a1d1d4e115c7f42e29aec1f1", description: "Successfully completed 'Learning Data Analytics Part 2: Extending and Applying Core Knowledge' by Robin Hunt.", skills: ["Data Analytics"], category: "Technology & Web Development", type: "course", tags: ["Data Analytics", "Advanced Analytics", "Data Application", "Business Intelligence"], pdf_document_link: "/Certificates/47 - CertificateOfCompletion_Learning Data Analytics Part 2 Extending and Applying Core Knowledge.pdf", is_verifiable: true, is_featured: false },
  { title: "Supercharge the Development Process with GitHub Extensions for Copilot Chat", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-02", expiry_date: null, does_not_expire: true, credential_id: "bb7a005522a90d274b74543986241db712075f24c27b9e01014eb4eca35bf043", credential_url: "https://www.linkedin.com/learning/certificates/bb7a005522a90d274b74543986241db712075f24c27b9e01014eb4eca35bf043", description: "Successfully completed 'Supercharge the Development Process with GitHub Extensions for Copilot Chat' by Ray Villalobos.", skills: ["GitHub"], category: "Technology & Web Development", type: "course", tags: ["GitHub", "GitHub Copilot", "DevTools", "AI Coding", "Copilot Chat"], pdf_document_link: "/Certificates/48 - CertificateOfCompletion_Supercharge the Development Process with GitHub Extensions for Copilot Chat.pdf", is_verifiable: true, is_featured: false },
  { title: "The Data Science of Economics, Banking, and Finance", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-06", expiry_date: null, does_not_expire: true, credential_id: "f3309b656267e36402b3d5f10bc593d1ec725843bc652e2067645cd3a8723479", credential_url: "https://www.linkedin.com/learning/certificates/f3309b656267e36402b3d5f10bc593d1ec725843bc652e2067645cd3a8723479", description: "Successfully completed 'The Data Science of Economics, Banking, and Finance' by Barton Poulson.", skills: ["Finance", "Economics", "Banking"], category: "Technology & Web Development", type: "course", tags: ["Data Science", "Economics", "Banking", "Finance", "FinTech"], pdf_document_link: "/Certificates/49 - CertificateOfCompletion_The Data Science of Economics Banking and Finance.pdf", is_verifiable: true, is_featured: true },
  { title: "Hands-on Data Science and AI for Healthcare", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-18", expiry_date: null, does_not_expire: true, credential_id: "d2d37b8e1c11f903355e2a0e3a2923759c2f393eeee867ea4147cbf3fa3ee988", credential_url: "https://www.linkedin.com/learning/certificates/d2d37b8e1c11f903355e2a0e3a2923759c2f393eeee867ea4147cbf3fa3ee988", description: "Successfully completed 'Hands-on Data Science and AI for Healthcare' by Wuraola Oyewusi.", skills: ["Healthcare Information Technology (HIT)", "Healthcare Analytics", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Data Science", "Healthcare AI", "HIT", "Medical Analytics"], pdf_document_link: "/Certificates/50 - CertificateOfCompletion_Handson Data Science and AI for Healthcare.pdf", is_verifiable: true, is_featured: true },
  { title: "Building Agentic AI Systems", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-18", expiry_date: null, does_not_expire: true, credential_id: "d23a55d7f5af698df96bcea25de26d4f683d23a276a75c39fb253750a4369ec1", credential_url: "https://www.linkedin.com/learning/certificates/d23a55d7f5af698df96bcea25de26d4f683d23a276a75c39fb253750a4369ec1", description: "Successfully completed 'Building Agentic AI Systems' by Rashim Mogha.", skills: ["AI Agents", "AI Software Development", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Agentic AI", "AI Agents", "Software Development", "Autonomous Systems"], pdf_document_link: "/Certificates/51 - CertificateOfCompletion_Building Agentic AI Systems.pdf", is_verifiable: true, is_featured: true },
  { title: "Build AI Agents and Automate Workflows with n8n", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/n8n logo.webp", issue_date: "2025-11-18", expiry_date: null, does_not_expire: true, credential_id: "b7c15087c4ab237c660bbd9db8f85ef9701eeea0b295ee6e0e8788dea7008d69", credential_url: "https://www.linkedin.com/learning/certificates/b7c15087c4ab237c660bbd9db8f85ef9701eeea0b295ee6e0e8788dea7008d69", description: "Successfully completed 'Build AI Agents and Automate Workflows with n8n' by Morten Rand-Hendriksen.", skills: ["AI Agents", "AI Productivity", "Generative AI"], category: "AI/ML", type: "course", tags: ["n8n", "AI Automation", "Workflow Automation", "AI Agents"], pdf_document_link: "/Certificates/52 - CertificateOfCompletion_Build AI Agents and Automate Workflows with n8n.pdf", is_verifiable: true, is_featured: true },
  { title: "Hands-On AI: Building Agents with the Google Agent Development Toolkit (ADK)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-23", expiry_date: null, does_not_expire: true, credential_id: "acada87a9cbb7664550a429809922eab80e2cc03f51f3d7c9ee9cc92cad68001", credential_url: "https://www.linkedin.com/learning/certificates/acada87a9cbb7664550a429809922eab80e2cc03f51f3d7c9ee9cc92cad68001", description: "Successfully completed 'Hands-On AI: Building Agents with the Google Agent Development Toolkit (ADK)' by Jigyasa Grover.", skills: ["AI Agents", "AI Software Development", "Agent Development"], category: "AI/ML", type: "course", tags: ["Google ADK", "AI Agents", "Agentic Systems", "Software Development"], pdf_document_link: "/Certificates/53 - CertificateOfCompletion_HandsOn AI Building Agents with the Google Agent Development Toolkit ADK.pdf", is_verifiable: true, is_featured: true },
  { title: "How to Be an Inclusive Leader (getAbstract Summary)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-23", expiry_date: null, does_not_expire: true, credential_id: "0d9ff6c42e5aef18f747a533517b6fa6f09c9abee9b2a3a381c5385656ae00b2", credential_url: "https://www.linkedin.com/learning/certificates/0d9ff6c42e5aef18f747a533517b6fa6f09c9abee9b2a3a381c5385656ae00b2", description: "Successfully completed 'How to Be an Inclusive Leader (getAbstract Summary)' by getAbstract.", skills: ["Team Leadership", "Diversity and Inclusion"], category: "Business & Strategy", type: "course", tags: ["Inclusive Leadership", "Leadership Summary", "DEI", "Management"], pdf_document_link: "/Certificates/54 - CertificateOfCompletion_How to Be an Inclusive Leader getAbstract Summary.pdf", is_verifiable: true, is_featured: false },
  { title: "HTML: Structured Semantic Data", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-23", expiry_date: null, does_not_expire: true, credential_id: "d18c439b0df7b0000a849ac5f1db5bd38d900ddae894f89b77eb140561e28ba2", credential_url: "https://www.linkedin.com/learning/certificates/d18c439b0df7b0000a849ac5f1db5bd38d900ddae894f89b77eb140561e28ba2", description: "Successfully completed 'HTML: Structured Semantic Data' by Jen Kramer.", skills: ["Semantic Markup", "HTML"], category: "Technology & Web Development", type: "course", tags: ["HTML", "Semantic Web", "SEO", "Accessibility", "Web Development"], pdf_document_link: "/Certificates/55 - CertificateOfCompletion_HTML Structured Semantic Data.pdf", is_verifiable: true, is_featured: false },
  { title: "MLOps Essentials: Model Development and Integration", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-23", expiry_date: null, does_not_expire: true, credential_id: "eb9a6fcecc1434e38ee4ac39d134de545eef15066bc9cdf7206667d95f0df673", credential_url: "https://www.linkedin.com/learning/certificates/eb9a6fcecc1434e38ee4ac39d134de545eef15066bc9cdf7206667d95f0df673", description: "Successfully completed 'MLOps Essentials: Model Development and Integration' by Kumaran Ponnambalam.", skills: ["MLOps", "Machine Learning", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["MLOps", "Model Integration", "DevOps for ML", "Production AI"], pdf_document_link: "/Certificates/56 - CertificateOfCompletion_MLOps Essentials Model Development and Integration.pdf", is_verifiable: true, is_featured: true },
  { title: "Practical Accessibility for Designers", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-25", expiry_date: null, does_not_expire: true, credential_id: "594f5d09efcb7b3372f093839ec0e272432313d02b17c9606ebee2567f60443e", credential_url: "https://www.linkedin.com/learning/certificates/594f5d09efcb7b3372f093839ec0e272432313d02b17c9606ebee2567f60443e", description: "Successfully completed 'Practical Accessibility for Designers' by Chimmy Kalu.", skills: ["Universal Design", "IT Accessibility", "Accessibility"], category: "Design & UX", type: "course", tags: ["Inclusive Design", "UX Design", "Web Accessibility", "Universal Design"], pdf_document_link: "/Certificates/57 - CertificateOfCompletion_Practical Accessibility for Designers.pdf", is_verifiable: true, is_featured: false },
  { title: "Strategic Project Risk Management", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "c9781d6e53232e03cfd4de9b51a31f507ac91c4911ed1506e8276e371d62e602", credential_url: "https://www.linkedin.com/learning/certificates/c9781d6e53232e03cfd4de9b51a31f507ac91c4911ed1506e8276e371d62e602", description: "Successfully completed 'Strategic Project Risk Management' by Dr. Prasad Kodukula.", skills: ["Strategic Planning", "Project Risk", "Project Management"], category: "Project Management", type: "course", tags: ["Risk Management", "Strategic Planning", "PMP Prep", "Project Governance"], pdf_document_link: "/Certificates/58 - CertificateOfCompletion_Strategic Project Risk Management.pdf", is_verifiable: true, is_featured: true },
  { title: "Flutter Essential Training: Build for Multiple Platforms", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Flutter_logo.svg", issue_date: "2025-10-26", expiry_date: null, does_not_expire: true, credential_id: "19972993b493fa59e58867db5f9fda2f6830441d790fe036f153e1220f420227", credential_url: "https://www.linkedin.com/learning/certificates/19972993b493fa59e58867db5f9fda2f6830441d790fe036f153e1220f420227", description: "Successfully completed 'Flutter Essential Training: Build for Multiple Platforms' by Pooja Bhaumik.", skills: ["Flutter", "Cross-platform Development"], category: "Technology & Web Development", type: "course", tags: ["Flutter", "Dart", "Mobile Development", "Cross-platform", "UI/UX"], pdf_document_link: "/Certificates/59 - CertificateOfCompletion_Flutter Essential Training Build for Multiple Platforms.pdf", is_verifiable: true, is_featured: true },
  { title: "How to Give Feedback People Can Actually Use", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "7485eea779574bdc0dae9b5f14bf16f1db62d4972d312ccf90ac3b04dc95a49c", credential_url: "https://www.linkedin.com/learning/certificates/7485eea779574bdc0dae9b5f14bf16f1db62d4972d312ccf90ac3b04dc95a49c", description: "Successfully completed 'How to Give Feedback People Can Actually Use' by Kwame Christian.", skills: ["Constructive Feedback", "Interpersonal Communication"], category: "Business & Strategy", type: "course", tags: ["Feedback", "Communication Skills", "Leadership", "Management", "Negotiation"], pdf_document_link: "/Certificates/60 - CertificateOfCompletion_How to Give Feedback People Can Actually Use.pdf", is_verifiable: true, is_featured: false },
  { title: "Business Intelligence for Consultants", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "86590d28240a3279bdd65398dd9ce53e8c52c56da0d9bb5b1b22b96df797310a", credential_url: "https://www.linkedin.com/learning/certificates/86590d28240a3279bdd65398dd9ce53e8c52c56da0d9bb5b1b22b96df797310a", description: "Successfully completed 'Business Intelligence for Consultants' by Joshua Rischin.", skills: ["Business Intelligence (BI)"], category: "Data Analytics", type: "course", tags: ["Business Intelligence", "Consulting", "Data Analysis", "Strategic Insights"], pdf_document_link: "/Certificates/61 - CertificateOfCompletion_Business Intelligence for Consultants.pdf", is_verifiable: true, is_featured: false },
  { title: "Using AI for Customer Service Managers", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-23", expiry_date: null, does_not_expire: true, credential_id: "b9ccfeb585f5e82b2e9c0d949ed76f6dc22678077a2507e67e1f9bc29332f4ba", credential_url: "https://www.linkedin.com/learning/certificates/b9ccfeb585f5e82b2e9c0d949ed76f6dc22678077a2507e67e1f9bc29332f4ba", description: "Successfully completed 'Using AI for Customer Service Managers' by Brad Cleveland.", skills: ["Customer Service Management", "AI for Business", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["AI for Business", "Customer Service", "AI Management", "Service Strategy"], pdf_document_link: "/Certificates/62 - CertificateOfCompletion_Using AI for Customer Service Managers.pdf", is_verifiable: true, is_featured: false },
  { title: "Generative AI for Sales and Services Professionals", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "8fa4209c482299346b0c3fc018ef0accbf583a63b65f38c9c159fa2b036c4c77", credential_url: "https://www.linkedin.com/learning/certificates/8fa4209c482299346b0c3fc018ef0accbf583a63b65f38c9c159fa2b036c4c77", description: "Successfully completed 'Generative AI for Sales and Services Professionals' by Sam Mallikarjunan.", skills: ["Sales Support Tools", "Generative AI for Sales", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Generative AI", "Sales AI", "Service Professionals", "AI Productivity"], pdf_document_link: "/Certificates/63 - CertificateOfCompletion_Generative AI for Sales and Services Professionals.pdf", is_verifiable: true, is_featured: false },
  { title: "Learning Microsoft 365 Copilot for Work (2024)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Microsoft_logo.svg", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "691d7cec2045ecb5b4afe38dd5ea3c1eac06162addf6a793890e9a4a1f667ed8", credential_url: "https://www.linkedin.com/learning/certificates/691d7cec2045ecb5b4afe38dd5ea3c1eac06162addf6a793890e9a4a1f667ed8", description: "Successfully completed 'Learning Microsoft 365 Copilot for Work (2024)' by Nicholas Brazzi.", skills: ["Microsoft Copilot", "Office 365", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Microsoft 365", "AI Productivity", "Microsoft Copilot", "Office Automation"], pdf_document_link: "/Certificates/64 - CertificateOfCompletion_Learning Microsoft 365 Copilot for Work 2024.pdf", is_verifiable: true, is_featured: false },
  { title: "Customer Journey Mapping with Generative AI", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "24b787407c65917f45303ea7c31bc8307e698efb7a4ad24b5dba4fbcbbd1b0ef", credential_url: "https://www.linkedin.com/learning/certificates/24b787407c65917f45303ea7c31bc8307e698efb7a4ad24b5dba4fbcbbd1b0ef", description: "Successfully completed 'Customer Journey Mapping with Generative AI' by Maury Rogow.", skills: ["Digital Marketing", "AI for Business", "Customer Journey Mapping"], category: "AI/ML", type: "course", tags: ["Customer Journey", "Generative AI", "Digital Marketing", "AI for Business", "CX"], pdf_document_link: "/Certificates/65 - CertificateOfCompletion_Customer Journey Mapping with Generative AI.pdf", is_verifiable: true, is_featured: false },
  { title: "Copilot for Service: Helpful Tips for Customer Service Agents", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/copilot.png", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "a8218b52fc046ba14c5fcfcdcef2b0047bc3865b360163d1a0fe94323960da9e", credential_url: "https://www.linkedin.com/learning/certificates/a8218b52fc046ba14c5fcfcdcef2b0047bc3865b360163d1a0fe94323960da9e", description: "Successfully completed 'Copilot for Service: Helpful Tips for Customer Service Agents' by Garrick Chow.", skills: ["Microsoft Copilot", "AI for Business", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Microsoft Copilot", "Customer Service", "AI Productivity", "Service Agents"], pdf_document_link: "/Certificates/66 - CertificateOfCompletion_Copilot for Service Helpful Tips for Customer Service Agents.pdf", is_verifiable: true, is_featured: false },
  { title: "Microsoft Copilot: The Art of Prompt Writing", issuer: "Microsoft via LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/copilot.png", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "934b8243adfe93bbee6ae56a99c33eba4901432207857d45f2cf395f0c8b9407", credential_url: "https://www.linkedin.com/learning/certificates/934b8243adfe93bbee6ae56a99c33eba4901432207857d45f2cf395f0c8b9407", description: "Successfully completed 'Microsoft Copilot: The Art of Prompt Writing' by Garrick Chow.", skills: ["AI Prompting", "Microsoft Copilot", "AI Productivity"], category: "AI/ML", type: "course", tags: ["Prompt Engineering", "Microsoft Copilot", "AI Productivity", "Generative AI"], pdf_document_link: "/Certificates/67 - CertificateOfCompletion_Microsoft Copilot The Art of Prompt Writing.pdf", is_verifiable: true, is_featured: true },
  { title: "Generative AI for Customer Service with Microsoft 365 Copilot Professional Certificate", issuer: "Microsoft via LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Microsoft_logo.svg", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "7a08162a81054e4408ee275d27ea665aec318ec7d6a11d6856f403aaaa06fef9", credential_url: "https://www.linkedin.com/learning/certificates/7a08162a81054e4408ee275d27ea665aec318ec7d6a11d6856f403aaaa06fef9", description: "Successfully earned the Professional Certificate in 'Generative AI for Customer Service with Microsoft 365 Copilot'.", skills: ["Generative AI for Customer Service", "Microsoft Copilot", "Artificial Intelligence (AI)"], category: "AI/ML", type: "professional certificate", tags: ["Generative AI", "Customer Service", "Microsoft 365", "Copilot", "Professional Certificate"], pdf_document_link: "/Certificates/68 - CertificateOfCompletion_Generative AI for Customer Service with Microsoft 365 Copilot Professional Certificate.pdf", is_verifiable: true, is_featured: true },
  { title: "Ideaflow: The Only Business Metric That Matters (Book Bite)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "13dc85c9beea0c8cf4ab702585f331198041d79d205a656cba04d296a14ec1ea", credential_url: "https://www.linkedin.com/learning/certificates/13dc85c9beea0c8cf4ab702585f331198041d79d205a656cba04d296a14ec1ea", description: "Successfully completed 'Ideaflow: The Only Business Metric That Matters (Book Bite)' by Next Big Idea Club.", skills: ["Ideas Development", "Team Management"], category: "Business & Strategy", type: "course", tags: ["Innovation", "Ideaflow", "Team Management", "Business Metrics", "Creative Strategy"], pdf_document_link: "/Certificates/69 - CertificateOfCompletion_Ideaflow The Only Business Metric That Matters Book Bite.pdf", is_verifiable: true, is_featured: false },
  { title: "A New Way to Think: Your Guide to Management Effectiveness (Book Bite)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-26", expiry_date: null, does_not_expire: true, credential_id: "0f49671ea2cf942d431b41dce4f7e75d0bd28c0c781d314c0dac06eb9c428016", credential_url: "https://www.linkedin.com/learning/certificates/0f49671ea2cf942d431b41dce4f7e75d0bd28c0c781d314c0dac06eb9c428016", description: "Successfully completed 'A New Way to Think: Your Guide to Management Effectiveness (Book Bite)' by Next Big Idea Club.", skills: ["Business Management"], category: "Business & Strategy", type: "course", tags: ["Management", "Leadership", "Business Strategy", "Professional Development"], pdf_document_link: "/Certificates/70 - CertificateOfCompletion_A New Way to Think Your Guide to Management Effectiveness Book Bite.pdf", is_verifiable: true, is_featured: false },
  { title: "Machine Learning with Python: Foundations", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-18", expiry_date: null, does_not_expire: true, credential_id: "329f056d23c4de34e8146825076713014aa017e86d5338955600f3362105cc39", credential_url: "https://www.linkedin.com/learning/certificates/329f056d23c4de34e8146825076713014aa017e86d5338955600f3362105cc39", description: "Successfully completed 'Machine Learning with Python: Foundations' by Frederick Nwanganga.", skills: ["Machine Learning", "Python (Programming Language)", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["Machine Learning", "Python", "Data Science", "AI Foundations"], pdf_document_link: "/Certificates/71 - CertificateOfCompletion_Machine Learning with Python Foundations.pdf", is_verifiable: true, is_featured: true },
  { title: "CSS: Advanced Layouts with Grid", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-27", expiry_date: null, does_not_expire: true, credential_id: "c1e3008dfd7d00768b9667a444d2083483857d7e8edd7295450bd233c3d4c70c", credential_url: "https://www.linkedin.com/learning/certificates/c1e3008dfd7d00768b9667a444d2083483857d7e8edd7295450bd233c3d4c70c", description: "Successfully completed 'CSS: Advanced Layouts with Grid' by Carrie Dils.", skills: ["CSS Grid Layout", "Web Development", "Front-End Development"], category: "Technology & Web Development", type: "course", tags: ["CSS Grid", "Frontend", "Web Design", "Responsive Layouts"], pdf_document_link: "/Certificates/72 - CertificateOfCompletion_CSS Advanced Layouts with Grid.pdf", is_verifiable: true, is_featured: true },
  { title: "Project Management Foundations: Ethics", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-27", expiry_date: null, does_not_expire: true, credential_id: "a26452336e2068550cba167344f4bddb410da4f90756d744d06449f53379981e", credential_url: "https://www.linkedin.com/learning/certificates/a26452336e2068550cba167344f4bddb410da4f90756d744d06449f53379981e", description: "Successfully completed 'Project Management Foundations: Ethics' by Bob McGannon.", skills: ["Business Ethics", "Project Management"], category: "Project Management", type: "course", tags: ["Business Ethics", "Project Management", "PMI", "Professional Conduct"], pdf_document_link: "/Certificates/73 - CertificateOfCompletion_Project Management Foundations Ethics.pdf", is_verifiable: true, is_featured: false },
  { title: "The Long-Distance Leader (getAbstract Summary)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-01", expiry_date: null, does_not_expire: true, credential_id: "8c205c24f902ad18eb66a04a5f49b457a78300029d33b590d3c047510a03f1d8", credential_url: "https://www.linkedin.com/learning/certificates/8c205c24f902ad18eb66a04a5f49b457a78300029d33b590d3c047510a03f1d8", description: "Successfully completed 'The Long-Distance Leader (getAbstract Summary)' by getAbstract.", skills: ["Remote Team Management"], category: "Business & Strategy", type: "course", tags: ["Remote Work", "Leadership", "Team Management", "getAbstract"], pdf_document_link: "/Certificates/74 - CertificateOfCompletion_The LongDistance Leader getAbstract Summary.pdf", is_verifiable: true, is_featured: false },
  { title: "Innovating with AI Design Using Autonomous Vehicles", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-03", expiry_date: null, does_not_expire: true, credential_id: "6c9b26891f639f9d161736df6582f2960bfc94ab475a0453e027a9a537ef8358", credential_url: "https://www.linkedin.com/learning/certificates/6c9b26891f639f9d161736df6582f2960bfc94ab475a0453e027a9a537ef8358", description: "Successfully completed 'Innovating with AI Design Using Autonomous Vehicles' by Sudha Jamthe.", skills: ["Design Thinking", "Voice & Data Convergence", "User Experience (UX)"], category: "AI/ML", type: "course", tags: ["Autonomous Vehicles", "AI Design", "UX", "Computer Vision", "Design Thinking"], pdf_document_link: "/Certificates/75 - CertificateOfCompletion_Innovating with AI Design Using Autonomous Vehicles.pdf", is_verifiable: true, is_featured: false },
  { title: "Cloud Storage Concepts: Services, Cost Control, and Security", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-03", expiry_date: null, does_not_expire: true, credential_id: "047a8d25b10115147c237ed3de60bb03319919790dec9789c205488481aae64c", credential_url: "https://www.linkedin.com/learning/certificates/047a8d25b10115147c237ed3de60bb03319919790dec9789c205488481aae64c", description: "Successfully completed 'Cloud Storage Concepts: Services, Cost Control, and Security' by David Linthicum.", skills: ["Storage Management", "Cloud Storage"], category: "Technology & Web Development", type: "course", tags: ["Cloud Computing", "Infrastructure", "Cloud Security", "Cost Management"], pdf_document_link: "/Certificates/76 - CertificateOfCompletion_Cloud Storage Concepts Services Cost Control and Security.pdf", is_verifiable: true, is_featured: false },
  { title: "Project Management with Microsoft Copilot", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/copilot.png", issue_date: "2025-12-04", expiry_date: null, does_not_expire: true, credential_id: "91d1aa1b52f792e77e0ed25a551c17fb5600241e2230d2c8dc7bf88460010489", credential_url: "https://www.linkedin.com/learning/certificates/91d1aa1b52f792e77e0ed25a551c17fb5600241e2230d2c8dc7bf88460010489", description: "Successfully completed 'Project Management with Microsoft Copilot' by Cindy M. Lewis.", skills: ["Microsoft Copilot", "Project Management", "Artificial Intelligence (AI)"], category: "Project Management", type: "course", tags: ["Microsoft Copilot", "AI for Project Management", "Automation", "Project Governance"], pdf_document_link: "/Certificates/77 - CertificateOfCompletion_Project Management with Microsoft Copilot.pdf", is_verifiable: true, is_featured: true },
  { title: "Leveraging AI for Penetration Testing", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-05", expiry_date: null, does_not_expire: true, credential_id: "3e225e7de88e5235fb76952a8d82cc9800308eb643e58eb9096f43bb753e6947", credential_url: "https://www.linkedin.com/learning/certificates/3e225e7de88e5235fb76952a8d82cc9800308eb643e58eb9096f43bb753e6947", description: "Successfully completed 'Leveraging AI for Penetration Testing' by Tennisha Virginia Martin.", skills: ["AI Security", "Penetration Testing", "Artificial Intelligence (AI)"], category: "Cybersecurity", type: "course", tags: ["Ethical Hacking", "AI Security", "Penetration Testing", "Cybersecurity Automation"], pdf_document_link: "/Certificates/78 - CertificateOfCompletion_Leveraging AI for Penetration Testing.pdf", is_verifiable: true, is_featured: true },
  { title: "DevOps Foundations", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-08", expiry_date: null, does_not_expire: true, credential_id: "7d11d7f1314d3be3ca63a05b355665ea387e4d48f83c33633f9f406dbc3d91e7", credential_url: "https://www.linkedin.com/learning/certificates/7d11d7f1314d3be3ca63a05b355665ea387e4d48f83c33633f9f406dbc3d91e7", description: "Successfully completed 'DevOps Foundations' by Ernest Mueller and James Wickett.", skills: ["DevOps"], category: "Technology & Web Development", type: "course", tags: ["DevOps", "Software Development Lifecycle", "CI/CD", "Automation", "CAMS"], pdf_document_link: "/Certificates/79 - CertificateOfCompletion_DevOps Foundations.pdf", is_verifiable: true, is_featured: true },
  { title: "DevOps Foundations: Continuous Delivery/Continuous Integration", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-09", expiry_date: null, does_not_expire: true, credential_id: "d0108935a69cf07e7a3d62e6edc23ce443170a1b5a2dc57352f0248afc96a4e8", credential_url: "https://www.linkedin.com/learning/certificates/d0108935a69cf07e7a3d62e6edc23ce443170a1b5a2dc57352f0248afc96a4e8", description: "Successfully completed 'DevOps Foundations: Continuous Delivery/Continuous Integration' by Ernest Mueller and James Wickett.", skills: ["Continuous Integration and Continuous Delivery (CI/CD)", "DevOps"], category: "Technology & Web Development", type: "course", tags: ["DevOps", "CI/CD", "Automation", "Software Engineering", "Continuous Delivery"], pdf_document_link: "/Certificates/80 - CertificateOfCompletion_DevOps Foundations Continuous DeliveryContinuous Integration.pdf", is_verifiable: true, is_featured: true },
  { title: "Google Distributed Cloud (GDC) Platform Introduction by Google", issuer: "Google Cloud via LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/Google Cloud.svg", issue_date: "2025-12-09", expiry_date: null, does_not_expire: true, credential_id: "6e8a757c694b4d1678f9f66c441bc29709026c4b930eab6f203ed45fc2da6fd3", credential_url: "https://www.linkedin.com/learning/certificates/6e8a757c694b4d1678f9f66c441bc29709026c4b930eab6f203ed45fc2da6fd3", description: "Successfully completed 'Google Distributed Cloud (GDC) Platform Introduction by Google' by Google Cloud.", skills: ["Google Cloud Platform (GCP)"], category: "Technology & Web Development", type: "course", tags: ["Google Cloud", "GDC", "Distributed Cloud", "Cloud Infrastructure", "Edge Computing"], pdf_document_link: "/Certificates/81 - CertificateOfCompletion_Google Distributed Cloud GDC Platform Introduction by Google.pdf", is_verifiable: true, is_featured: true },
  { title: "Continuous Integration: Tools", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-12", expiry_date: null, does_not_expire: true, credential_id: "faf7fbd827e88e8deaec52502bf78164769cf2061ae45b24374f25f56e910607", credential_url: "https://www.linkedin.com/learning/certificates/faf7fbd827e88e8deaec52502bf78164769cf2061ae45b24374f25f56e910607", description: "Successfully completed 'Continuous Integration: Tools' by Michael J.", skills: ["Continuous Integration (CI)"], category: "Technology & Web Development", type: "course", tags: ["Continuous Integration", "DevOps Tools", "Automation", "Software Engineering"], pdf_document_link: "/Certificates/82 - CertificateOfCompletion_Continuous Integration Tools.pdf", is_verifiable: true, is_featured: true },
  { title: "Boosting Your Influence Skills with Generative AI", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-12", expiry_date: null, does_not_expire: true, credential_id: "93446d040fdf4653cb4112eeccacc434421fa3634aa94cf8530bf281df41a37a", credential_url: "https://www.linkedin.com/learning/certificates/93446d040fdf4653cb4112eeccacc434421fa3634aa94cf8530bf281df41a37a", description: "Successfully completed 'Boosting Your Influence Skills with Generative AI' by Henna Pryor.", skills: ["Influencing Others", "Artificial Intelligence (AI)", "Generative AI"], category: "AI/ML", type: "course", tags: ["Generative AI", "Soft Skills", "Influence", "Communication", "Persuasion"], pdf_document_link: "/Certificates/83 - CertificateOfCompletion_Boosting Your Influence Skills with Generative AI.pdf", is_verifiable: true, is_featured: false },
  { title: "Build with AI: Create a Follow-Up App with React, Supabase, and Cursor", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-15", expiry_date: null, does_not_expire: true, credential_id: "f41519017d16cc9d3cec659028b49ea2c394a29e58149503d0b6a86aab5b984e", credential_url: "https://www.linkedin.com/learning/certificates/f41519017d16cc9d3cec659028b49ea2c394a29e58149503d0b6a86aab5b984e", description: "Successfully completed 'Build with AI: Create a Follow-Up App with React, Supabase, and Cursor' by Ayodele Aransiola.", skills: ["React.js", "AI Software Development", "Artificial Intelligence (AI)"], category: "Technology & Web Development", type: "course", tags: ["React", "Supabase", "Cursor", "AI-Powered Development", "Full-Stack"], pdf_document_link: "/Certificates/84 - CertificateOfCompletion_Build with AI Create a FollowUp App with React Supabase and Cursor.pdf", is_verifiable: true, is_featured: true },
  { title: "AI Accountability: Build Responsible and Transparent Systems", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-19", expiry_date: null, does_not_expire: true, credential_id: "293fc1aa8a5fba7fdb6dc3c3f21091d119f5f2b0e0dd36866076236b9db4fd96", credential_url: "https://www.linkedin.com/learning/certificates/293fc1aa8a5fba7fdb6dc3c3f21091d119f5f2b0e0dd36866076236b9db4fd96", description: "Successfully completed 'AI Accountability: Build Responsible and Transparent Systems' by Barton Poulson.", skills: ["Responsible AI", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["AI Ethics", "Responsible AI", "Accountability", "Transparency", "AI Governance"], pdf_document_link: "/Certificates/85 - CertificateOfCompletion_AI Accountability Build Responsible and Transparent Systems.pdf", is_verifiable: true, is_featured: true },
  { title: "The AI-Driven Cybersecurity Analyst", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-19", expiry_date: null, does_not_expire: true, credential_id: "9a2aee2241c55f4694adf0fc7a910998dcc135e28689e77e930f1d13d0648edd", credential_url: "https://www.linkedin.com/learning/certificates/9a2aee2241c55f4694adf0fc7a910998dcc135e28689e77e930f1d13d0648edd", description: "Successfully completed 'The AI-Driven Cybersecurity Analyst' by Michael Wylie.", skills: ["Information Security Analysis", "Artificial Intelligence (AI)", "Generative AI"], category: "Cybersecurity", type: "course", tags: ["Cybersecurity", "AI-Driven Security", "Threat Hunting", "Generative AI", "Information Security"], pdf_document_link: "/Certificates/86 - CertificateOfCompletion_The AIDriven Cybersecurity Analyst.pdf", is_verifiable: true, is_featured: true },
  { title: "Responsible AI Algorithm Design", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-25", expiry_date: null, does_not_expire: true, credential_id: "f8d9dfbf51287982dfddedf5df8780f0959b9744ec2c7dfa93dd6ba5aa068ba5", credential_url: "https://www.linkedin.com/learning/certificates/f8d9dfbf51287982dfddedf5df8780f0959b9744ec2c7dfa93dd6ba5aa068ba5", description: "Successfully completed 'Responsible AI Algorithm Design' by Dr. Isil Berkun.", skills: ["Algorithm Design", "Artificial Intelligence (AI)", "Responsible AI"], category: "AI/ML", type: "course", tags: ["AI Ethics", "Algorithm Design", "Responsible AI", "Algorithmic Fairness"], pdf_document_link: "/Certificates/87 - CertificateOfCompletion_Responsible AI Algorithm Design.pdf", is_verifiable: true, is_featured: true },
  { title: "Teamwork Foundations", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-12-29", expiry_date: null, does_not_expire: true, credential_id: "dc7f2dcd19055194047094edad72b46ac053fe67da5bbe3695178e8754d31c82", credential_url: "https://www.linkedin.com/learning/certificates/dc7f2dcd19055194047094edad72b46ac053fe67da5bbe3695178e8754d31c82", description: "Successfully completed 'Teamwork Foundations' by Chris Croft.", skills: ["Teamwork"], category: "Soft Skills", type: "course", tags: ["Collaboration", "Teamwork", "Leadership", "Communication", "Professional Development"], pdf_document_link: "/Certificates/88 - CertificateOfCompletion_Teamwork Foundations.pdf", is_verifiable: true, is_featured: false },
  { title: "Java 17: First Look", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-04-16", expiry_date: null, does_not_expire: true, credential_id: "f880487098ea57016a34d7d66623f5702a8e18cab8f0eedfb9aa47f7e03b2773", credential_url: "https://www.linkedin.com/learning/certificates/f880487098ea57016a34d7d66623f5702a8e18cab8f0eedfb9aa47f7e03b2773", description: "Successfully completed 'Java 17: First Look' by Kathryn Hodge.", skills: ["Java"], category: "Technology & Web Development", type: "course", tags: ["Java", "Backend Development", "Software Engineering", "Object-Oriented Programming"], pdf_document_link: "/Certificates/89 - CertificateOfCompletion_Java 17 First Look.pdf", is_verifiable: true, is_featured: true },
  { title: "Ethics and Law in Data Analytics", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-11-18", expiry_date: null, does_not_expire: true, credential_id: "09bc9bc5984c0156febe92ca3e1fde08b7741431210de08b0f93db727655d5d6", credential_url: "https://www.linkedin.com/learning/certificates/09bc9bc5984c0156febe92ca3e1fde08b7741431210de08b0f93db727655d5d6", description: "Successfully completed 'Ethics and Law in Data Analytics' by Microsoft General Technical Skills.", skills: ["Business Ethics", "Data Analytics"], category: "Data Science & Analytics", type: "course", tags: ["Data Ethics", "Data Privacy", "Legal Compliance", "Responsible AI", "Data Analytics"], pdf_document_link: "/Certificates/90 - CertificateOfCompletion_Ethics and Law in Data Analytics.pdf", is_verifiable: true, is_featured: true },
  { title: "Writing a Business Case", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2026-01-01", expiry_date: null, does_not_expire: true, credential_id: "0d25bdef8668a9f5fcb79b4d35de0338f5e9e743dd4ac49bbe898329d53e8027", credential_url: "https://www.linkedin.com/learning/certificates/0d25bdef8668a9f5fcb79b4d35de0338f5e9e743dd4ac49bbe898329d53e8027", description: "Successfully completed 'Writing a Business Case' by Mike Figliuolo.", skills: ["Business Case Development"], category: "Business & Strategy", type: "course", tags: ["Business Case", "Strategy", "Professional Communication", "Stakeholder Management"], pdf_document_link: "/Certificates/91 - CertificateOfCompletion_Writing a Business Case.pdf", is_verifiable: true, is_featured: false },
  { title: "Blockchain Security by Infosec", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2026-01-01", expiry_date: null, does_not_expire: true, credential_id: "6f618ed08817813a8ec80e03b08357c9d84394fff5e8266ce5eb6aa847336a8a", credential_url: "https://www.linkedin.com/learning/certificates/6f618ed08817813a8ec80e03b08357c9d84394fff5e8266ce5eb6aa847336a8a", description: "Successfully completed 'Blockchain Security by Infosec' by Infosec Institute.", skills: ["Cybersecurity", "Cryptography", "Blockchain"], category: "Cybersecurity", type: "course", tags: ["Blockchain", "Cryptography", "Cybersecurity", "Infosec", "Smart Contract Security"], pdf_document_link: "/Certificates/92 - CertificateOfCompletion_Blockchain Security by Infosec.pdf", is_verifiable: true, is_featured: true },
  { title: "Wavelet Analysis: Applications with Wolfram Language", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2026-01-02", expiry_date: null, does_not_expire: true, credential_id: "b611a9fb7ab4af2c803d82f3f0710463e2080d232c2a32e986c1a3580bc28c67", credential_url: "https://www.linkedin.com/learning/certificates/b611a9fb7ab4af2c803d82f3f0710463e2080d232c2a32e986c1a3580bc28c67", description: "Successfully completed 'Wavelet Analysis: Applications with Wolfram Language' by Wolfram Research.", skills: ["Wolfram Language", "Data Analysis", "Wavelets"], category: "Data Science & Analytics", type: "course", tags: ["Wavelet Analysis", "Wolfram Language", "Signal Processing", "Mathematical Computing"], pdf_document_link: "/Certificates/93 - CertificateOfCompletion_Wavelet Analysis Applications with Wolfram Language.pdf", is_verifiable: true, is_featured: true },
  { title: "IT Service Management Foundations: Problem Management", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2026-01-06", expiry_date: null, does_not_expire: true, credential_id: "e9545c60b9349855e912d1fa99f59aed057bbd9389a12eab1f68f259a2cb607e", credential_url: "https://www.linkedin.com/learning/certificates/e9545c60b9349855e912d1fa99f59aed057bbd9389a12eab1f68f259a2cb607e", description: "Successfully completed 'IT Service Management Foundations: Problem Management' by Shane Chagpar.", skills: ["IT Service Management"], category: "Technology & Web Development", type: "course", tags: ["ITSM", "Problem Management", "Root Cause Analysis", "ITIL Foundations", "Operations"], pdf_document_link: "/Certificates/94 - CertificateOfCompletion_IT Service Management Foundations Problem Management.pdf", is_verifiable: true, is_featured: false },
  { title: "IT Service Desk: Monitoring and Metrics Fundamentals", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2026-02-07", expiry_date: null, does_not_expire: true, credential_id: "0844d6f1c7e74b292a2b59c872f9e44ff4e9703718f52ba9d13e237294c33425", credential_url: "https://www.linkedin.com/learning/certificates/0844d6f1c7e74b292a2b59c872f9e44ff4e9703718f52ba9d13e237294c33425", description: "Successfully completed 'IT Service Desk: Monitoring and Metrics Fundamentals' by Brett Moffett.", skills: ["IT Service Management"], category: "Technology & Web Development", type: "course", tags: ["ITSM", "Service Desk", "KPIs", "Performance Metrics", "IT Operations"], pdf_document_link: "/Certificates/95 - CertificateOfCompletion_IT Service Desk Monitoring and Metrics Fundamentals.pdf", is_verifiable: true, is_featured: false },
  { title: "Everyday AI Concepts (2nd edition)", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2025-10-22", expiry_date: null, does_not_expire: true, credential_id: "8246341535ebc7a6bf3391a363e4fa0d71fe2ee0c52d0456d3a2e120c0efd839_2", credential_url: "https://www.linkedin.com/learning/certificates/8246341535ebc7a6bf3391a363e4fa0d71fe2ee0c52d0456d3a2e120c0efd839", description: "Successfully completed 'Everyday AI Concepts' by Doug Rose (second completion).", skills: ["AI for Business", "Artificial Intelligence (AI)"], category: "AI/ML", type: "course", tags: ["AI Concepts", "Machine Learning", "Business Automation", "Everyday AI"], pdf_document_link: "/Certificates/96 - CertificateOfCompletion_Everyday AI Concepts.pdf", is_verifiable: true, is_featured: false },
  { title: "Building a Responsible AI Program: Context, Culture, Content, and Commitment", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2026-02-11", expiry_date: null, does_not_expire: true, credential_id: "2bdca5c20dc0a03f22b80ad6398b29555f7a44f572951be474e8a91d8d6eec73", credential_url: "https://www.linkedin.com/learning/certificates/2bdca5c20dc0a03f22b80ad6398b29555f7a44f572951be474e8a91d8d6eec73", description: "Successfully completed 'Building a Responsible AI Program: Context, Culture, Content, and Commitment' by Katrina Ingram.", skills: ["Ethical Leadership", "Artificial Intelligence (AI)", "Responsible AI"], category: "AI/ML", type: "course", tags: ["AI Ethics", "Responsible AI", "Governance", "Ethical Leadership", "Change Management"], pdf_document_link: "/Certificates/97 - CertificateOfCompletion_Building a Responsible AI Program Context Culture Content and Commitment.pdf", is_verifiable: true, is_featured: true },
  { title: "Social Media Marketing Foundations", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2026-02-11", expiry_date: null, does_not_expire: true, credential_id: "a3f3ce4d87e482f208712ff184ec7d3a4f2e56ca8111975357a838edd83585ac", credential_url: "https://www.linkedin.com/learning/certificates/a3f3ce4d87e482f208712ff184ec7d3a4f2e56ca8111975357a838edd83585ac", description: "Successfully completed 'Social Media Marketing Foundations' by Brian Honigman.", skills: ["Social Media Marketing"], category: "Marketing & Communication", type: "course", tags: ["Social Media Strategy", "Digital Marketing", "Content Strategy", "Brand Awareness", "Marketing Analytics"], pdf_document_link: "/Certificates/98 - CertificateOfCompletion_Social Media Marketing Foundations.pdf", is_verifiable: true, is_featured: false },
  { title: "Social Media Marketing: Strategy and Optimization", issuer: "LinkedIn Learning", platform: "LinkedIn Learning", issuer_logo: "/Logo/linkedin.svg", issue_date: "2026-02-12", expiry_date: null, does_not_expire: true, credential_id: "2e56fa98b6b17512399c58a14e842bac5dc3b5b050007d46d547c5bc5c6a0016", credential_url: "https://www.linkedin.com/learning/certificates/2e56fa98b6b17512399c58a14e842bac5dc3b5b050007d46d547c5bc5c6a0016", description: "Successfully completed 'Social Media Marketing: Strategy and Optimization' by Martin Waxman.", skills: ["Social Media Marketing", "Social Media Optimization (SMO)"], category: "Marketing & Communication", type: "course", tags: ["Social Media Strategy", "SMO", "Digital Marketing", "Content Optimization", "Marketing Analytics"], pdf_document_link: "/Certificates/99 - CertificateOfCompletion_Social Media Marketing Strategy and Optimization.pdf", is_verifiable: true, is_featured: false },
];

const certEditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  platform: z.string().min(1, 'Platform is required'),
  issuer_logo: z.string().optional().or(z.literal('')),
  issue_date: z.string().min(1, 'Issue date is required'),
  credential_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  description: z.string().optional(),
  category: z.string().default('Technology & Web Development'),
  type: z.string().default('course'),
  is_featured: z.boolean().default(false),
  pdf_document_link: z.string().optional().or(z.literal('')),
});

type CertEditFormData = z.infer<typeof certEditSchema>;

const CERT_CATEGORIES = [
  'AI/ML', 'Business & Strategy', 'Cloud & DevOps', 'Cybersecurity',
  'Data Science & Analytics', 'Marketing & Communication',
  'Software Development', 'Soft Skills', 'Technology & Web Development',
];
const CERT_TYPES = ['course', 'certification', 'professional certificate', 'bootcamp'];

const defaultCertValues: CertEditFormData = {
  title: '', issuer: '', platform: '', issuer_logo: '',
  issue_date: '', credential_url: '', description: '',
  category: 'Technology & Web Development', type: 'course',
  is_featured: false, pdf_document_link: '',
};

const AdminCertificates = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeedLoading, setIsSeedLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editCert, setEditCert] = useState<Certificate | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string | number; label: string } | null>(null);

  const form = useForm<CertEditFormData>({
    resolver: zodResolver(certEditSchema),
    defaultValues: defaultCertValues,
  });

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const data = await CommonService.getCertificates();
      setCertificates(data);
    } catch {
      toast.error('Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      setIsSeedLoading(true);
      await Promise.all(SEED_DATA.map(cert => CommonService.createCertificate(cert)));
      await fetchCertificates();
      toast.success('99 certificates seeded successfully');
    } catch {
      toast.error('Failed to seed certificates');
    } finally {
      setIsSeedLoading(false);
    }
  };

  const openSheet = (cert: Certificate | null) => {
    setEditCert(cert);
    form.reset(cert ? {
      title: cert.title,
      issuer: cert.issuer,
      platform: cert.platform,
      issuer_logo: cert.issuer_logo ?? '',
      issue_date: cert.issue_date,
      credential_url: cert.credential_url ?? '',
      description: cert.description ?? '',
      category: cert.category,
      type: cert.type,
      is_featured: cert.is_featured,
      pdf_document_link: cert.pdf_document_link ?? '',
    } : defaultCertValues);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    if (form.formState.isDirty) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    setIsSheetOpen(false);
    setEditCert(null);
  };

  const handleSheetSave = async (data: CertEditFormData) => {
    setIsSaving(true);
    try {
      if (editCert) {
        await CommonService.updateCertificate(editCert.id, data);
        toast.success('Certificate updated');
      } else {
        await CommonService.createCertificate(data);
        toast.success('Certificate added');
      }
      form.reset(defaultCertValues);
      setIsSheetOpen(false);
      setEditCert(null);
      fetchCertificates();
    } catch {
      toast.error('Failed to save certificate');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRequest = () => {
    if (!editCert) return;
    setIsSheetOpen(false);
    setDeleteTarget({ id: editCert.id, label: editCert.title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteCertificate(deleteTarget.id);
      toast.success('Certificate deleted');
      fetchCertificates();
    } catch { toast.error('Delete failed'); }
    finally { setDeleteTarget(null); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="CREDENTIALS"
        title="Certificates"
        subtitle="Showcase your verified achievements and professional learning."
        backTo="/dashboard"
        actions={
          <>
            {!isLoading && certificates.length === 0 && (
              <Button
                variant="outline"
                onClick={handleSeed}
                disabled={isSeedLoading}
                className="border-accent/30 hover:bg-accent/10 rounded-lg h-11 px-5 text-accent hover:text-accent transition-all shadow-sm font-black"
              >
                <DatabaseZap className="w-4 h-4 mr-2" /> {isSeedLoading ? 'Seeding...' : 'Seed Default Data'}
              </Button>
            )}
            <Button
              onClick={() => openSheet(null)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-black h-11 px-6 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Certificate
            </Button>
          </>
        }
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-[272px] w-full bg-secondary border border-border rounded-xl animate-pulse" />
          ))
        ) : certificates.length > 0 ? (
          certificates.map((cert, index) => (
            <button
              key={cert.id}
              type="button"
              onClick={() => openSheet(cert)}
              className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-accent/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left h-[272px] flex flex-col cursor-pointer animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 30}ms`, animationDuration: '300ms', animationFillMode: 'both' }}
            >
              {/* Hover tint */}
              <div className="absolute inset-0 bg-accent/[0.03] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />

              {/* Edit icon badge */}
              <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-7 h-7 rounded-lg bg-card/90 backdrop-blur-sm border border-border/80 flex items-center justify-center text-accent shadow-sm">
                  <Edit2 className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Logo area — fixed 144px height */}
              <div className="h-[144px] bg-secondary border-b border-border flex items-center justify-center p-8 flex-shrink-0 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {cert.issuer_logo ? (
                  <img
                    src={cert.issuer_logo}
                    alt={cert.issuer}
                    className="h-16 w-24 object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 z-10"
                  />
                ) : (
                  <Award className="w-12 h-12 text-accent/20 group-hover:text-accent/50 transition-colors z-10" />
                )}
              </div>

              {/* Content — fills remaining height */}
              <div className="p-4 flex flex-col flex-1 min-h-0">
                <h3
                  className="font-black text-foreground text-sm line-clamp-2 group-hover:text-accent transition-colors leading-snug"
                >
                  {cert.title}
                </h3>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5 truncate">{cert.issuer}</p>

                <div className="mt-auto flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-accent/70" />
                    {cert.issue_date}
                  </span>
                  {cert.credential_url && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); window.open(cert.credential_url, '_blank'); }}
                      className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-accent transition-colors flex items-center gap-1"
                    >
                      Verify <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState
              icon={Award}
              title="No certificates added"
              description="Showcase your verified achievements and professional learning."
              action={{ label: 'Add Certificate', onClick: () => openSheet(null) }}
            />
          </div>
        )}
      </div>

      {/* Edit / Add Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[480px] bg-card border-l border-border text-foreground flex flex-col p-0"
        >
          <SheetHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <SheetTitle className="text-xl font-black text-foreground">
              {editCert ? 'Edit Certificate' : 'Add Certificate'}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <Form {...form}>
              <form id="cert-sheet-form" onSubmit={form.handleSubmit(handleSheetSave)} className="px-6 py-4 space-y-4">
                <FormField control={form.control} name="issuer_logo" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground font-medium text-sm">Issuer Logo</FormLabel>
                    <FormControl>
                      <LogoUpload value={field.value as string} onChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground font-medium text-sm">Certificate Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Python Essential Training" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent/50" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="issuer" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-medium text-sm">Issuer *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="LinkedIn Learning" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent/50" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="platform" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-medium text-sm">Platform *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="LinkedIn Learning" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent/50" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="issue_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground font-medium text-sm">Issue Date *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="YYYY-MM-DD" className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent/50" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-medium text-sm">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value as string}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border text-foreground focus:border-accent/50">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-border text-foreground">
                          {CERT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground font-medium text-sm">Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value as string}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border text-foreground focus:border-accent/50">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-border text-foreground">
                          {CERT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="credential_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground font-medium text-sm">Credential URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent/50" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="pdf_document_link" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground font-medium text-sm">PDF Link (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="/Certificates/..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent/50" />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground font-medium text-sm">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="What did you learn?"
                        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent/50 min-h-[90px]"
                      />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="is_featured" render={({ field }) => (
                  <FormItem className="flex items-center gap-3 py-1">
                    <FormControl>
                      <Checkbox
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                        className="border-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-medium text-muted-foreground cursor-pointer !mt-0">
                      Feature this certificate
                    </FormLabel>
                  </FormItem>
                )} />
              </form>
            </Form>
          </ScrollArea>

          {/* Sheet footer */}
          <div className="px-6 py-4 border-t border-border flex-shrink-0 space-y-2">
            <Button
              type="submit"
              form="cert-sheet-form"
              disabled={isSaving}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-black h-11"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
            {editCert && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDeleteRequest}
                className="w-full text-danger-fg hover:bg-danger-subtle hover:text-danger-fg border border-danger/20 font-black"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Entry
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Certificate?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default AdminCertificates;
