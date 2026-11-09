import { requireAuth } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Bell, Shield, Trash2, Mail } from 'lucide-react';

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-8">

      <div className="space-y-8">
          {/* Profile Section */}
          <section id="profile" className="pb-8 border-b border-gray-200">
            <div className="py-2">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
              <p className="text-sm text-gray-500 mt-1">Update your personal information.</p>
            </div>
            <div className="py-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Button variant="outline" >Change Avatar</Button>
                </div>
              </div>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user.name} className="bg-white border-gray-200 text-gray-900" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input id="email" defaultValue={user.email} disabled className="pl-9 bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed" />
                    </div>
                    <p className="text-xs text-gray-500">Contact support to change your email address.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <Label>Account Role</Label>
                    <Input disabled value={user.role} className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed capitalize" />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <Input disabled value="Active" className="bg-gray-50 border-gray-200 text-emerald-700 font-medium cursor-not-allowed capitalize" />
                  </div>
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <Input disabled value={new Date(user.createdAt).toLocaleDateString()} className="bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed" />
                  </div>
                </div>
                <div className="pt-2">
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm">Save Changes</Button>
                </div>
              </form>
            </div>
          </section>

          {/* Notifications Section */}
          <section id="notifications" className="pb-8 border-b border-gray-200">
            <div className="py-2">
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              <p className="text-sm text-gray-500 mt-1">Choose how you want to be alerted when a monitor fails.</p>
            </div>
            <div className="py-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Email Alerts</h4>
                  <p className="text-xs text-gray-500 mt-1">Receive emails at {user.email} when a monitor goes down.</p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input type="checkbox" name="toggle" id="toggle1" defaultChecked className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-gray-200 appearance-none cursor-pointer checked:right-0 right-5 checked:border-blue-500 transition-all duration-300" />
                  <label htmlFor="toggle1" className="toggle-label block overflow-hidden h-5 rounded-full bg-blue-500 cursor-pointer"></label>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Weekly Reports</h4>
                  <p className="text-xs text-gray-500 mt-1">Receive a weekly summary of your monitors&apos; uptime and performance.</p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input type="checkbox" name="toggle" id="toggle2" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-gray-200 appearance-none cursor-pointer checked:right-0 right-5 checked:border-blue-500 transition-all duration-300" />
                  <label htmlFor="toggle2" className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer"></label>
                </div>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section id="danger" className="py-4">
            <div className="py-2">
              <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
            </div>
            <div className="py-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Delete Account</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md">Permanently delete your account, all monitors, and ping history. This action cannot be undone.</p>
                </div>
                <Button variant="danger" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 whitespace-nowrap">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </section>
        </div>
    </div>
  );
}
