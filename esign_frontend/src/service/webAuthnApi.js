import apiClient from "./apiClient";

export const startRegistration = async () => {
    const response = await apiClient.post("/webauthn/register/start");
    return response.data;
};

export const finishRegistration = async (credentialJson) => {
    const response = await apiClient.post("/webauthn/register/finish", {
        credentialJson: JSON.stringify(credentialJson)
    });
    return response.data;
};

export const startAuthentication = async () => {
    const response = await apiClient.post("/webauthn/login/start");
    return response.data;
};

export const finishAuthentication = async (credentialJson) => {
    const response = await apiClient.post("/webauthn/login/finish", {
        credentialJson: JSON.stringify(credentialJson)
    });
    return response.data;
};
