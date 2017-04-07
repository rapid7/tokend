#
# Cookbook Name:: tokend
# Recipe:: default
#
# Copyright (C) 2017 Rapid7 LLC.
#
# Distributed under terms of the MIT License. All rights not explicitly granted
# in the MIT license are reserved. See the included LICENSE file for more details.
#

node.default['tokend']['version'] = cookbook_version

group node['tokend']['group'] do
  system true
end

user node['tokend']['user'] do
  comment 'tokend operator'
  system true

  gid node['tokend']['group']
  home node['tokend']['paths']['directory']
end

## Fetch and install tokend
remote_file 'tokend' do
  source Tokend::Helpers.github_download('rapid7', 'tokend', node['tokend']['version'])
  path ::File.join(Chef::Config['file_cache_path'], "tokend-#{node['tokend']['version']}.deb")

  action :create_if_missing
  backup false
end

version_dir = "#{ node['tokend']['paths']['directory'] }-#{ node['tokend']['version'] }"

package 'tokend' do
  source resources('remote_file[tokend]').path
  provider Chef::Provider::Package::Dpkg
end

## Symlink the version dir to the specified tokend directory
link node['tokend']['paths']['directory'] do
  to version_dir
  notifies :restart, 'service[tokend]' if node['tokend']['enable']
end

if Chef::VersionConstraint.new("> 14.04").include?(node['platform_version'])
  service_script_path = '/etc/systemd/system/tokend.service'
  service_script = 'systemd.service.erb'
  service_provider = Chef::Provider::Service::Systemd
else
  service_script_path = '/etc/init/tokend.conf'
  service_script = 'upstart.conf.erb'
  service_provider = Chef::Provider::Service::Upstart
end

# Set service script
template service_script_path do
  source service_script
  variables(
    :description => 'tokend configuration service',
    :user => node['tokend']['user'],
    :executable => node['tokend']['paths']['executable'],
    :flags => [
      "-c #{node['tokend']['paths']['configuration']}"
    ]
  )
end

directory 'tokend-configuration-directory' do
  path ::File.dirname(node['tokend']['paths']['configuration'])
  mode '0755'

  recursive true
end

template 'tokend-configuration' do
  path node['tokend']['paths']['configuration']
  source 'json.erb'

  variables(:properties => node['tokend']['config'])
  notifies :restart, 'service[tokend]' if node['tokend']['enable']
end

service 'tokend' do
  action node['tokend']['enable'] ? [:start, :enable] : [:stop, :disable]
  provider service_provider
end
