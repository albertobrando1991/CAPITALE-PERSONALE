
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Mail, ExternalLink } from "lucide-react";

interface ContactOptions {
    whatsapp: {
        number: string;
        text: string;
        link: string;
    };
    email: {
        address: string;
        subject: string;
        body: string;
    };
}

interface ContactSupportProps {
    options: ContactOptions;
}

export function ContactSupport({ options }: ContactSupportProps) {
    if (!options) return null;

    return (
        <Card className="w-full bg-slate-50 border-blue-200 mt-2 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                    📞 Contatta il Supporto Staff
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <p className="text-xs text-slate-600 mb-2">
                    Per assistenza diretta, puoi scriverci su WhatsApp o via Email.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        className="w-full justify-start text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 border-green-200"
                        onClick={() => window.open(options.whatsapp.link, '_blank')}
                    >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        WhatsApp
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full justify-start text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                        onClick={() => window.location.href = `mailto:${options.email.address}?subject=${encodeURIComponent(options.email.subject)}&body=${encodeURIComponent(options.email.body)}`}
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
