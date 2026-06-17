export const notify = (message, type = 'info', duration = 3000) => {
    const event = new CustomEvent('app-notification', {
        detail: { message, type, duration }
    });
    window.dispatchEvent(event);
};
