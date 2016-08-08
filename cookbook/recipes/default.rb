#
# Cookbook Name:: tokend
# Recipe:: default
#
# Copyright (C) 2016 Rapid7 LLC.
#
# Distributed under terms of the MIT License. All rights not explicitly granted
# in the MIT license are reserved. See the included LICENSE file for more details.
#

#######################
## Install NodeJS 4.x
#
# This should be moved into a shared cookbook
##
include_recipe 'apt::default'

apt_repository 'nodejs-4x' do
  uri 'https://deb.nodesource.com/node_4.x'
  distribution node['lsb']['codename']
  components ['main']
  key 'https://deb.nodesource.com/gpgkey/nodesource.gpg.key'
end

package 'nodejs'
#######################

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

directory node['tokend']['paths']['directory'] do
  owner node['tokend']['user']
  group node['tokend']['group']
  mode '0755'

  recursive true
end

## Fetch and install tokend
remote_file 'tokend' do
  source tokend::Helpers.github_download('rapid7', 'tokend', node['tokend']['version'])
  path ::File.join(Chef::Config['file_cache_path'], "tokend-#{node['tokend']['version']}.deb")

  action :create_if_missing
  backup false
end

package 'tokend' do
  source resources('remote_file[tokend]').path
  provider Chef::Provider::Package::Dpkg
end

## Upstart Service
template '/etc/init/tokend.conf' do
  owner node['tokend']['user']
  group node['tokend']['group']

  source 'upstart.conf.erb'
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

  owner node['tokend']['user']
  group node['tokend']['group']
  mode '0755'

  recursive true
end

template 'tokend-configuration' do
  path node['tokend']['paths']['configuration']
  source 'json.erb'

  owner node['tokend']['user']
  group node['tokend']['group']

  variables(:properties => node['tokend']['config'])
end

service 'tokend' do
  ## The wrapping cookbook must call `action` on this resource to start/enable
  action :nothing

  provider Chef::Provider::Service::Upstart
end
