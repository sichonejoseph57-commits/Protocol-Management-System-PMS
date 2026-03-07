/**
 * Generate a unique subdomain from company name
 * Example: "ABC Company Ltd" -> "abc-company"
 */
export function generateSubdomain(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 63); // DNS subdomain max length
}

/**
 * Check if subdomain is available
 */
export async function isSubdomainAvailable(subdomain: string, supabaseClient: any): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('organizations')
    .select('id')
    .eq('subdomain', subdomain)
    .maybeSingle();
  
  if (error) {
    console.error('Subdomain check error:', error);
    return false;
  }
  
  return !data;
}

/**
 * Generate unique subdomain with fallback numbering
 */
export async function generateUniqueSubdomain(
  companyName: string,
  supabaseClient: any
): Promise<string> {
  let subdomain = generateSubdomain(companyName);
  let counter = 1;
  
  while (!(await isSubdomainAvailable(subdomain, supabaseClient))) {
    subdomain = `${generateSubdomain(companyName)}-${counter}`;
    counter++;
    
    if (counter > 100) {
      throw new Error('Unable to generate unique subdomain');
    }
  }
  
  return subdomain;
}
