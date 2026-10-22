const handleCommercialSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingCommercial(true);
    try {
      // 1. Submit the form to the database as "Pending"
      const { error } = await supabase.from('commercial_profiles').upsert({
        id: session.user.id,
        company_name: commercialForm.company_name,
        sector: commercialForm.sector,
        registration_country: commercialForm.registration_country,
        annual_revenue: parseFloat(commercialForm.annual_revenue),
        monthly_burn_rate: parseFloat(commercialForm.monthly_burn_rate),
        debt_to_equity_ratio: parseFloat(commercialForm.debt_to_equity_ratio),
        pascaline_status: 'pending_review' 
      });
      if (error) throw error;
      
      triggerGlobalActionNotification('success', 'Corporate telemetry submitted. Pascaline AI audit initiated.');

      // 2. Force the frontend to show the loading screen for 2 seconds (simulating AI thought process)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Trigger the backend AI Edge Function to audit the math
      await supabase.functions.invoke('pascaline-commercial-audit', {
        body: { userId: session.user.id }
      });

      // 4. Fetch the final verdict (Approved or Declined)
      await fetchAllData();
      
    } catch (err) {
      triggerGlobalActionNotification('error', err.message || 'Submission failed.');
    } finally {
      setIsSubmittingCommercial(false);
    }
  };