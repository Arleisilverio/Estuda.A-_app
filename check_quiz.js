async function go() {
  const res = await fetch("https://qdbsdsnhygxlzrjmvhva.supabase.co/functions/v1/generate-quiz", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ subjectId: 21, subjectName: "Direito" })
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
go();
