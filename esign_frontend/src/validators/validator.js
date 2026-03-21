// ===== BLOCKLIST DOMAIN EMAIL TẠM =====
const BLOCKED_EMAIL_DOMAINS = [
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net',
    'tempmail.com', 'yopmail.com', 'throwaway.email',
    '10minutemail.com', 'trashmail.com', 'fakeinbox.com',
    'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
    'dispostable.com', 'maildrop.cc', 'mailnesia.com',
    'temp-mail.org', 'getnada.com', 'mohmal.com', 'emailondeck.com'
];

const arrValidators = {
    required: (value) => {
        return value.trim() ? true : "Vui lòng nhập trường này.";
    },

    email: (value) => {
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        return emailRegex.test(value) ? true : "Đây phải là trường email";
    },

    emailDomain: (value) => {
        const domain = value.split('@')[1]?.toLowerCase();
        if (!domain) return "Email không hợp lệ";
        if (BLOCKED_EMAIL_DOMAINS.includes(domain)) {
            return "Không chấp nhận email tạm thời. Vui lòng dùng email thật.";
        }
        return true;
    },

    min: (value, length) => {
        return value.length >= length ? true : `Mật khẩu phải có ít nhất ${length} ký tự.`;
    },

    strongPassword: (value) => {
        if (value.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
        if (!/[A-Z]/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ in hoa";
        if (!/[a-z]/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ thường";
        if (!/[0-9]/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ số";
        return true;
    },

    phone: (value) => {
        const phoneRegex = /^(0|\+84)[0-9]{9}$/;
        return phoneRegex.test(value) ? true : "Số điện thoại không hợp lệ (VD: 0123456789)";
    },

    confirmPassword: (password, confirmPassword) => {
        return password === confirmPassword ? true : "Mật khẩu không khớp.";
    }
};

export const validateField = (value, name, filedError) => {
    const rules = filedError[name];
    for (let rule of rules) {
        if (typeof rule === "string") {
            const error = arrValidators[rule](value);
            if (error !== true) {
                return error;
            }
        } else {
            const ruleName = Object.keys(rule)[0];
            const error = arrValidators[ruleName](value, rule[ruleName]);
            if (error !== true) {
                return error;
            }
        }
    }
    return "";
}