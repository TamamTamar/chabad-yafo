export type PreviousLeader = { firstName: string; phone: string };

export async function notifyOutbid(previousLeader: PreviousLeader, newLeadingAmount: number) {
    const payload = {
        event: 'maftir_yona_outbid',
        firstName: previousLeader.firstName,
        phone: previousLeader.phone,
        newLeadingAmount,
        auctionUrl: 'https://chabadyafo.org/maftir-yona',
    };
    const webhookUrl = process.env.MAFTIR_YONA_OUTBID_WEBHOOK_URL?.trim();
    if (!webhookUrl) return payload;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
            redirect: 'error',
        });
        if (!response.ok) {
            console.error('Maftir Yona outbid webhook failed; accepted bid is unaffected.', { status: response.status });
        }
        // No response data is needed; release the connection without waiting for a body.
        await response.body?.cancel();
    } catch {
        // Do not log the webhook URL, response body or recipient details.
        console.error('Maftir Yona outbid webhook failed; accepted bid is unaffected.', {
            reason: controller.signal.aborted ? 'timeout' : 'network_error',
        });
    } finally {
        clearTimeout(timeout);
    }
    return payload;
}
