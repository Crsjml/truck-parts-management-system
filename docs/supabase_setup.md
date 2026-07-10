# Supabase Authentication Setup Guide

This guide will walk you through setting up a free Supabase project and grabbing the necessary API keys so that your application can properly handle User Authentication.

## Step 1: Create a Supabase Project
1. Go to [Supabase.com](https://supabase.com/) and click **Start your project** (or sign in if you already have an account).
2. Click **New Project** and select the default organization (or create a new one).
3. Fill in the project details:
   - **Name**: `Truck Parts Management` (or any name you prefer).
   - **Database Password**: Generate a secure password and save it somewhere safe (you won't need it for this migration since we are using local Postgres, but Supabase requires it).
   - **Region**: Select the region closest to you or your users.
4. Click **Create new project**. Note: It may take a few minutes for the project to provision.

## Step 2: Locate Your API Keys
Once your project has finished provisioning, you'll need to grab three specific keys to link your frontend and backend.

1. On your project dashboard, click on the **Settings** icon (the gear icon at the bottom of the left sidebar).
2. Select **API** under the Configuration section.
3. You will see a section for your Project URL and Project API Keys:
   - Copy the **Project URL**. This is your `SUPABASE_URL` (and `VITE_SUPABASE_URL`).
   - Copy the `anon` `public` key. This is your `VITE_SUPABASE_ANON_KEY` (used by the frontend).
   - Copy the `service_role` `secret` key. This is your `SUPABASE_SERVICE_ROLE_KEY` (used by the backend middleware to verify tokens). **Keep this secret!** Never share it or expose it in the frontend code.

## Step 3: Enable Email/Password Authentication
1. Go to the **Authentication** tab from the left sidebar.
2. Under Configuration, select **Providers**.
3. Click on the **Email** provider.
4. Ensure **Enable Email provider** is toggled ON.
5. **Important for Local Testing:** Toggle OFF **Confirm email**. 
   - *Why?* This allows you to instantly log in with newly created accounts during development without needing to set up an SMTP server to deliver confirmation emails.
6. Click **Save**.

## What's Next?
Keep these keys handy! In the next steps, we will place these keys into your local `.env` files so the application can start securely creating users.
