import type { RegistrationInput } from "@/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARS_REGEX = /^\+?[\d\s\-()]{7,24}$/;

export interface NormalizedRegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  yearOfStudy: string;
  track: string;
  experienceLevel: string;
  portfolioUrl?: string;
  notes?: string;
}

export function validateAndNormalizeRegistrationInput(
  input: RegistrationInput
): { valid: true; data: NormalizedRegistrationInput } | { valid: false; message: string } {
  const fullName = input.fullName?.trim() || "";
  const email = input.email?.trim().toLowerCase() || "";
  const phone = input.phone?.trim() || "";
  const track = input.track?.trim() || "";

  if (!fullName || !email || !phone || !track) {
    return { valid: false, message: "All required fields must be provided." };
  }

  if (!input.agreedToCoc) {
    return {
      valid: false,
      message: "You must agree to the Code of Conduct and guidelines.",
    };
  }

  if (fullName.length > 120) {
    return { valid: false, message: "Full name must be 120 characters or fewer." };
  }

  if (email.length > 160 || !EMAIL_REGEX.test(email)) {
    return { valid: false, message: "Please provide a valid email address." };
  }

  const digitCount = phone.replace(/\D/g, "").length;
  if (!PHONE_CHARS_REGEX.test(phone) || digitCount < 7 || digitCount > 15) {
    return { valid: false, message: "Please provide a valid phone number." };
  }

  if (track.length > 120) {
    return { valid: false, message: "Selected track value is too long." };
  }

  const college =
    input.college?.trim() || "Vidyavardhini's College of Engineering & Technology (VCET)";
  if (college.length > 200) {
    return { valid: false, message: "College name must be 200 characters or fewer." };
  }

  const rawPortfolio = input.portfolioUrl?.trim() || "";
  let portfolioUrl: string | undefined;
  if (rawPortfolio) {
    if (rawPortfolio.length > 300) {
      return { valid: false, message: "Portfolio URL must be 300 characters or fewer." };
    }
    try {
      const parsed = new URL(rawPortfolio);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          valid: false,
          message: "Portfolio URL must start with http:// or https://.",
        };
      }
      portfolioUrl = parsed.toString();
    } catch {
      return {
        valid: false,
        message: "Please enter a valid Portfolio / GitHub / LinkedIn URL (starting with https://).",
      };
    }
  }

  const rawNotes = input.notes?.trim() || "";
  if (rawNotes.length > 500) {
    return { valid: false, message: "Notes must be 500 characters or fewer." };
  }

  return {
    valid: true,
    data: {
      fullName,
      email,
      phone,
      college,
      department: input.department?.trim() || "Computer Engg",
      yearOfStudy: input.yearOfStudy?.trim() || "3rd Year",
      track,
      experienceLevel: input.experienceLevel?.trim() || "Intermediate",
      portfolioUrl,
      notes: rawNotes || undefined,
    },
  };
}

