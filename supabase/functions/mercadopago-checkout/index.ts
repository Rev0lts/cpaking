import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { planId, userId, userEmail } = await req.json()

        const planLabels: any = {
            monthly: 'Mensal',
            quarterly: 'Trimestral',
            annual: 'Anual'
        }

        const planLabel = planLabels[planId] || planId

        const secretValue = Deno.env.get(`MP_PLAN_${planId.toUpperCase()}_ID`)

        if (!secretValue) {
            console.error(`Configuração ausente: MP_PLAN_${planId.toUpperCase()}_ID`)
            throw new Error(`Configuração do plano ${planId} não encontrada nos Secrets do Supabase.`)
        }

        const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
        if (!accessToken) throw new Error('MP_ACCESS_TOKEN não configurado')

        const requestBody: any = {
            reason: `CPAKing - Assinatura ${planLabel}`,
            external_reference: `${userId}:${planId}`,
            payer_email: userEmail,
            back_url: `${Deno.env.get('FRONTEND_URL') || 'https://cpaking.vercel.app'}/?status=success`,
            status: 'pending'
        }

        // Se o valor nos secrets for um número (preço), criamos a assinatura "on-the-fly"
        // Se for um texto longo, assumimos que é um preapproval_plan_id
        const isPrice = /^\d+([.,]\d+)?$/.test(secretValue)

        if (isPrice) {
            const amount = parseFloat(secretValue.replace(',', '.'))
            console.log(`Modo sem Plano: Criando assinatura recorrente direta para ${planId} com valor R$ ${amount}`)

            const recurrenceMapping: any = {
                monthly: { frequency: 1, frequency_type: 'months' },
                quarterly: { frequency: 3, frequency_type: 'months' },
                annual: { frequency: 12, frequency_type: 'months' }
            }

            const recurrence = recurrenceMapping[planId] || recurrenceMapping.monthly

            requestBody.auto_recurring = {
                frequency: recurrence.frequency,
                frequency_type: recurrence.frequency_type,
                transaction_amount: amount,
                currency_id: 'BRL'
            }
        } else {
            console.log(`Modo com Plano: Usando Plan ID pre-existente: ${secretValue.substring(0, 8)}...`)
            requestBody.preapproval_plan_id = secretValue
        }

        const response = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Erro detalhado do Mercado Pago:', JSON.stringify(errorData))
            throw new Error(`MP API Error [${response.status}]: ${errorData.message || JSON.stringify(errorData)}`)
        }

        const data = await response.json()

        if (!data.init_point) {
            console.error('Mercado Pago não retornou init_point:', data)
            throw new Error('A API do Mercado Pago não retornou o link de pagamento.')
        }

        return new Response(JSON.stringify({ url: data.init_point }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Falha na execução da função:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
