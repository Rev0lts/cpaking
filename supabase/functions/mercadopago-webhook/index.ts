import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || searchParams.get('topic')
    const id = searchParams.get('id') || searchParams.get('data.id')

    console.log(`Webhook recebido: Tipo=${type}, ID=${id}`)

    // Para assinaturas, o tópico costuma ser 'subscription_preapproval' ou via recurso de payment se for a primeira cobrança
    if (type === 'subscription_preapproval') {
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN')

        // Buscar detalhes da assinatura
        const response = await fetch(`https://api.mercadopago.com/v1/preapproval/${id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        const subscription = await response.json()
        console.log(`Status da Assinatura: ${subscription.status}`)

        if (subscription.status === 'authorized') {
            const [userId, planId] = subscription.external_reference.split(':')

            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // Calcular expiração (ex: 30 dias para mensal, etc ou baseado no ciclo)
            // No modelo recorrente, o próprio MP gerencia a validade, mas atualizamos o status local
            const { error } = await supabase
                .from('profiles')
                .update({
                    plan_type: planId,
                    plan_expires_at: new Date(subscription.next_payment_date).toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)

            if (error) console.error('Erro ao atualizar perfil:', error)
            else console.log(`Plano ${planId} ativado para usuário ${userId}`)
        }
    }

    return new Response('ok', { status: 200 })
})
