import HomePage from "@/components/home-page"
import { verifyUser } from "@/lib/verifyUser"

export default async function Home({ params }) {
   const { experienceId } = await params;

   // Verify user authentication and get access level
   let userAuth = { userId: null, accessLevel: "no_access", isAuthenticated: false };

   try {
      const { userId, accessLevel } = await verifyUser(experienceId);
      userAuth = {
         userId,
         accessLevel,
         isAuthenticated: !!userId
      };
   } catch (error) {
      console.log("User verification failed:", error.message);
   }

   return <HomePage experienceId={experienceId} userAuth={userAuth} />
}